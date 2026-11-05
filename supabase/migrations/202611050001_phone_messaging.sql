-- Phone directory and encrypted one-to-one messaging for the WhatsApp clone.
create table if not exists public.messaging_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text unique,
  updated_at timestamptz not null default now()
);

create or replace function public.sync_verified_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.messaging_profiles (user_id, phone_e164, updated_at)
  values (new.id, case when new.phone_confirmed_at is not null then new.phone else null end, now())
  on conflict (user_id) do update set phone_e164 = excluded.phone_e164, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_changed on auth.users;
create trigger on_auth_user_phone_changed after insert or update of phone, phone_confirmed_at on auth.users
for each row execute function public.sync_verified_phone();

insert into public.messaging_profiles (user_id, phone_e164)
select id, phone from auth.users where phone_confirmed_at is not null
on conflict (user_id) do update set phone_e164 = excluded.phone_e164, updated_at = now();

create table if not exists public.messaging_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  identity_key jsonb not null,
  signed_prekey jsonb not null,
  signed_prekey_signature text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table if not exists public.messaging_one_time_prekeys (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  device_id text not null,
  key_id integer not null,
  public_key jsonb not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (user_id, device_id, key_id),
  foreign key (user_id, device_id) references public.messaging_devices(user_id, device_id) on delete cascade
);
create index if not exists messaging_prekeys_available_idx
  on public.messaging_one_time_prekeys (user_id, device_id, id) where claimed_at is null;

create table if not exists public.messaging_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint messaging_conversations_ordered_users check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.messaging_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.messaging_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_device_id text not null,
  recipient_device_id text not null,
  one_time_prekey_id integer,
  ephemeral_public_key jsonb not null,
  salt text not null,
  nonce text not null,
  ciphertext text not null,
  signature text not null,
  created_at timestamptz not null default now(),
  constraint messaging_messages_distinct_users check (sender_id <> recipient_id)
);
create index if not exists messaging_messages_conversation_created_idx
  on public.messaging_messages (conversation_id, created_at);

alter table public.messaging_profiles enable row level security;
alter table public.messaging_devices enable row level security;
alter table public.messaging_one_time_prekeys enable row level security;
alter table public.messaging_conversations enable row level security;
alter table public.messaging_messages enable row level security;

drop policy if exists "Users can view public device keys" on public.messaging_devices;
create policy "Users can view public device keys" on public.messaging_devices for select to authenticated using (true);
drop policy if exists "Users can manage their own devices" on public.messaging_devices;
create policy "Users can manage their own devices" on public.messaging_devices for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can view public prekeys" on public.messaging_one_time_prekeys;
create policy "Users can view public prekeys" on public.messaging_one_time_prekeys for select to authenticated using (true);
drop policy if exists "Users can add their own prekeys" on public.messaging_one_time_prekeys;
create policy "Users can add their own prekeys" on public.messaging_one_time_prekeys for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read their conversations" on public.messaging_conversations;
create policy "Users can read their conversations" on public.messaging_conversations for select to authenticated
using (auth.uid() = user_a or auth.uid() = user_b);
drop policy if exists "Participants can read encrypted messages" on public.messaging_messages;
create policy "Participants can read encrypted messages" on public.messaging_messages for select to authenticated
using (auth.uid() in (sender_id, recipient_id) and exists (
  select 1 from public.messaging_conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
));
drop policy if exists "Senders can add encrypted messages" on public.messaging_messages;
create policy "Senders can add encrypted messages" on public.messaging_messages for insert to authenticated
with check (auth.uid() = sender_id and exists (
  select 1 from public.messaging_conversations c where c.id = conversation_id
    and auth.uid() in (c.user_a, c.user_b) and recipient_id in (c.user_a, c.user_b) and sender_id <> recipient_id
));

create or replace function public.find_messaging_recipient(phone_value text)
returns table (user_id uuid, device_id text, identity_key jsonb, signed_prekey jsonb, signed_prekey_signature text)
language sql security definer set search_path = '' as $$
  select d.user_id, d.device_id, d.identity_key, d.signed_prekey, d.signed_prekey_signature
  from public.messaging_profiles p join public.messaging_devices d on d.user_id = p.user_id
  where auth.uid() is not null and p.phone_e164 = phone_value and p.user_id <> auth.uid();
$$;

create or replace function public.get_or_create_messaging_conversation(target_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); conversation_id uuid; first_user uuid; second_user uuid;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if caller_id = target_user_id then raise exception 'Cannot start a conversation with yourself'; end if;
  if not exists (select 1 from public.messaging_profiles p where p.user_id = caller_id and p.phone_e164 is not null)
     or not exists (select 1 from public.messaging_profiles p where p.user_id = target_user_id and p.phone_e164 is not null) then
    raise exception 'Both users need a verified phone number';
  end if;
  first_user := least(caller_id, target_user_id); second_user := greatest(caller_id, target_user_id);
  insert into public.messaging_conversations (user_a, user_b) values (first_user, second_user)
    on conflict (user_a, user_b) do update set user_a = excluded.user_a returning id into conversation_id;
  return conversation_id;
end;
$$;

create or replace function public.claim_messaging_prekey(target_user_id uuid, target_device_id text)
returns table (user_id uuid, device_id text, identity_key jsonb, signed_prekey jsonb, signed_prekey_signature text,
  one_time_prekey_id integer, one_time_prekey jsonb)
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); chosen public.messaging_one_time_prekeys%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.messaging_profiles p where p.user_id = target_user_id and p.phone_e164 is not null) then
    raise exception 'Recipient phone number is not verified';
  end if;
  select p.* into chosen from public.messaging_one_time_prekeys p
    where p.user_id = target_user_id and p.device_id = target_device_id and p.claimed_at is null
    order by p.id for update skip locked limit 1;
  if found then update public.messaging_one_time_prekeys p set claimed_at = now() where p.id = chosen.id; end if;
  return query select d.user_id, d.device_id, d.identity_key, d.signed_prekey, d.signed_prekey_signature,
    case when chosen.id is null then null else chosen.key_id end,
    case when chosen.id is null then null else chosen.public_key end
    from public.messaging_devices d where d.user_id = target_user_id and d.device_id = target_device_id;
end;
$$;

revoke all on function public.find_messaging_recipient(text) from public;
revoke all on function public.get_or_create_messaging_conversation(uuid) from public;
revoke all on function public.claim_messaging_prekey(uuid, text) from public;
grant execute on function public.find_messaging_recipient(text) to authenticated;
grant execute on function public.get_or_create_messaging_conversation(uuid) to authenticated;
grant execute on function public.claim_messaging_prekey(uuid, text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'messaging_messages') then
    alter publication supabase_realtime add table public.messaging_messages;
  end if;
end;
$$;
