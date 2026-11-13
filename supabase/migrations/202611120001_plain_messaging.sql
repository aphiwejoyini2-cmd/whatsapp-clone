-- Plain-text one-to-one messaging for the existing phone-auth flow.
-- Messages are visible to Supabase because they are intentionally not encrypted.
create table if not exists public.simple_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint simple_conversations_ordered_users check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.simple_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.simple_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists simple_messages_conversation_created_idx
  on public.simple_messages (conversation_id, created_at);

alter table public.simple_conversations enable row level security;
alter table public.simple_messages enable row level security;
grant select on public.simple_conversations to authenticated;
grant select, insert on public.simple_messages to authenticated;

drop policy if exists "Participants can read simple conversations" on public.simple_conversations;
create policy "Participants can read simple conversations"
  on public.simple_conversations for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "Participants can read simple messages" on public.simple_messages;
create policy "Participants can read simple messages"
  on public.simple_messages for select to authenticated
  using (exists (
    select 1 from public.simple_conversations c
    where c.id = simple_messages.conversation_id and auth.uid() in (c.user_a, c.user_b)
  ));

drop policy if exists "Participants can send simple messages" on public.simple_messages;
create policy "Participants can send simple messages"
  on public.simple_messages for insert to authenticated
  with check (auth.uid() = sender_id and exists (
    select 1 from public.simple_conversations c
    where c.id = simple_messages.conversation_id and auth.uid() in (c.user_a, c.user_b)
  ));

create or replace function public.find_simple_message_recipient(phone_value text)
returns table (user_id uuid, phone_e164 text)
language sql
security definer
set search_path = ''
as $$
  select p.user_id, p.phone_e164
  from public.messaging_profiles p
  where auth.uid() is not null
    and p.user_id <> auth.uid()
    and regexp_replace(trim(p.phone_e164), '[^0-9+]', '', 'g') = regexp_replace(trim(phone_value), '[^0-9+]', '', 'g');
$$;

create or replace function public.get_or_create_simple_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  conversation_id uuid;
  first_user uuid;
  second_user uuid;
begin
  if caller_id is null then raise exception 'Sign in before starting a conversation'; end if;
  if caller_id = target_user_id then raise exception 'You cannot message your own account'; end if;
  if not exists (select 1 from public.messaging_profiles p where p.user_id = caller_id and p.phone_e164 is not null)
     or not exists (select 1 from public.messaging_profiles p where p.user_id = target_user_id and p.phone_e164 is not null) then
    raise exception 'Both accounts need a phone number registered in Supabase';
  end if;

  first_user := least(caller_id, target_user_id);
  second_user := greatest(caller_id, target_user_id);
  insert into public.simple_conversations (user_a, user_b)
  values (first_user, second_user)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into conversation_id;
  return conversation_id;
end;
$$;

revoke all on function public.find_simple_message_recipient(text) from public;
grant execute on function public.find_simple_message_recipient(text) to authenticated;
revoke all on function public.get_or_create_simple_conversation(uuid) from public;
grant execute on function public.get_or_create_simple_conversation(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'simple_messages'
  ) then
    alter publication supabase_realtime add table public.simple_messages;
  end if;
end;
$$;
