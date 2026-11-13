-- Keep existing verified-phone accounts discoverable by the plain-text chat flow.
-- New signups continue to use raw_user_meta_data.phone_e164 without SMS verification.
create or replace function public.sync_simple_messaging_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone_e164', ''), '[^0-9+]', '', 'g');
begin
  if account_phone !~ '^\+[1-9][0-9]{7,14}$' and new.phone_confirmed_at is not null then
    account_phone := regexp_replace(coalesce(new.phone, ''), '[^0-9+]', '', 'g');
  end if;

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
after insert or update of raw_user_meta_data, phone, phone_confirmed_at on auth.users
for each row execute function public.sync_simple_messaging_phone();

create or replace function public.get_my_simple_messaging_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.phone_e164
  from public.simple_messaging_profiles p
  where auth.uid() is not null and p.user_id = auth.uid();
$$;

revoke all on function public.get_my_simple_messaging_phone() from public;
grant execute on function public.get_my_simple_messaging_phone() to authenticated;

-- Backfill confirmed phone numbers for accounts created before phone_e164 metadata was collected.
insert into public.simple_messaging_profiles (user_id, phone_e164)
select mp.user_id, regexp_replace(mp.phone_e164, '[^0-9+]', '', 'g')
from public.messaging_profiles mp
where mp.phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  and not exists (
    select 1 from public.simple_messaging_profiles existing
    where existing.user_id = mp.user_id or existing.phone_e164 = regexp_replace(mp.phone_e164, '[^0-9+]', '', 'g')
  )
on conflict (user_id) do nothing;
