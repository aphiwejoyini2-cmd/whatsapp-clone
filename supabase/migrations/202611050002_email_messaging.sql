-- Route messaging accounts by confirmed email so chat does not depend on paid SMS.
alter table public.messaging_profiles
  add column if not exists email_normalized text unique;

create or replace function public.sync_messaging_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.messaging_profiles (user_id, email_normalized, updated_at)
  values (
    new.id,
    case when new.email_confirmed_at is not null then lower(trim(new.email)) else null end,
    now()
  )
  on conflict (user_id) do update
    set email_normalized = excluded.email_normalized,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.sync_messaging_email();

insert into public.messaging_profiles (user_id, email_normalized)
select id, lower(trim(email))
from auth.users
where email_confirmed_at is not null and email is not null
on conflict (user_id) do update
  set email_normalized = excluded.email_normalized,
      updated_at = now();

drop function if exists public.find_messaging_recipient(text);
create function public.find_messaging_recipient(email_value text)
returns table (
  user_id uuid,
  device_id text,
  identity_key jsonb,
  signed_prekey jsonb,
  signed_prekey_signature text
)
language sql
security definer
set search_path = ''
as $$
  select d.user_id, d.device_id, d.identity_key, d.signed_prekey, d.signed_prekey_signature
  from public.messaging_profiles p
  join public.messaging_devices d on d.user_id = p.user_id
  where auth.uid() is not null
    and p.email_normalized = lower(trim(email_value))
    and p.user_id <> auth.uid();
$$;

create or replace function public.get_or_create_messaging_conversation(target_user_id uuid)
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
  if caller_id is null then raise exception 'Authentication required'; end if;
  if caller_id = target_user_id then raise exception 'Cannot start a conversation with yourself'; end if;
  if not exists (select 1 from public.messaging_profiles p where p.user_id = caller_id and p.email_normalized is not null)
     or not exists (select 1 from public.messaging_profiles p where p.user_id = target_user_id and p.email_normalized is not null) then
    raise exception 'Both users need a confirmed email address';
  end if;
  first_user := least(caller_id, target_user_id);
  second_user := greatest(caller_id, target_user_id);
  insert into public.messaging_conversations (user_a, user_b)
  values (first_user, second_user)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into conversation_id;
  return conversation_id;
end;
$$;

create or replace function public.claim_messaging_prekey(target_user_id uuid, target_device_id text)
returns table (
  user_id uuid,
  device_id text,
  identity_key jsonb,
  signed_prekey jsonb,
  signed_prekey_signature text,
  one_time_prekey_id integer,
  one_time_prekey jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  chosen public.messaging_one_time_prekeys%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.messaging_profiles p where p.user_id = target_user_id and p.email_normalized is not null) then
    raise exception 'Recipient email is not confirmed';
  end if;
  select p.* into chosen
  from public.messaging_one_time_prekeys p
  where p.user_id = target_user_id and p.device_id = target_device_id and p.claimed_at is null
  order by p.id
  for update skip locked
  limit 1;
  if found then
    update public.messaging_one_time_prekeys p set claimed_at = now() where p.id = chosen.id;
  end if;
  return query
    select d.user_id, d.device_id, d.identity_key, d.signed_prekey, d.signed_prekey_signature,
      case when chosen.id is null then null else chosen.key_id end,
      case when chosen.id is null then null else chosen.public_key end
    from public.messaging_devices d
    where d.user_id = target_user_id and d.device_id = target_device_id;
end;
$$;

revoke all on function public.find_messaging_recipient(text) from public;
grant execute on function public.find_messaging_recipient(text) to authenticated;
revoke all on function public.get_or_create_messaging_conversation(uuid) from public;
grant execute on function public.get_or_create_messaging_conversation(uuid) to authenticated;
revoke all on function public.claim_messaging_prekey(uuid, text) from public;
grant execute on function public.claim_messaging_prekey(uuid, text) to authenticated;
