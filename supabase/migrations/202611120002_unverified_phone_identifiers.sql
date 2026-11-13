-- Use the phone entered at signup only as a unique messaging identifier.
-- Auth is email/password; this value is deliberately not verified by SMS.
create table if not exists public.simple_messaging_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text not null unique,
  created_at timestamptz not null default now()
);

alter table public.simple_messaging_profiles enable row level security;

create or replace function public.sync_simple_messaging_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone_e164', ''), '[^0-9+]', '', 'g');
begin
  if account_phone ~ '^\+[1-9][0-9]{7,14}$' then
    insert into public.simple_messaging_profiles (user_id, phone_e164)
    values (new.id, account_phone)
    on conflict (user_id) do update set phone_e164 = excluded.phone_e164;
  else
    delete from public.simple_messaging_profiles where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_metadata_changed on auth.users;
create trigger on_auth_user_phone_metadata_changed
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_simple_messaging_phone();

insert into public.simple_messaging_profiles (user_id, phone_e164)
select id, regexp_replace(raw_user_meta_data ->> 'phone_e164', '[^0-9+]', '', 'g')
from auth.users
where coalesce(raw_user_meta_data ->> 'phone_e164', '') ~ '^\+[1-9][0-9]{7,14}$'
on conflict (user_id) do update set phone_e164 = excluded.phone_e164;

create or replace function public.find_simple_message_recipient(phone_value text)
returns table (user_id uuid, phone_e164 text)
language sql
security definer
set search_path = ''
as $$
  select p.user_id, p.phone_e164
  from public.simple_messaging_profiles p
  where auth.uid() is not null
    and p.user_id <> auth.uid()
    and p.phone_e164 = regexp_replace(trim(phone_value), '[^0-9+]', '', 'g');
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
  if not exists (select 1 from public.simple_messaging_profiles p where p.user_id = caller_id)
     or not exists (select 1 from public.simple_messaging_profiles p where p.user_id = target_user_id) then
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
