-- Store status updates for signed-in users and count distinct conversation
-- partners who open each update. Statuses expire 24 hours after creation.
create table if not exists public.status_updates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  text text not null default '',
  media_data text,
  media_type text,
  created_at timestamptz not null default now(),
  constraint status_updates_content_check check (char_length(text) <= 280),
  constraint status_updates_payload_check check (char_length(text) > 0 or media_data is not null)
);

create index if not exists status_updates_owner_created_idx
  on public.status_updates (owner_id, created_at desc);
create index if not exists status_updates_created_idx
  on public.status_updates (created_at);

create table if not exists public.status_update_views (
  status_id uuid not null references public.status_updates(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

create index if not exists status_update_views_viewer_idx
  on public.status_update_views (viewer_id, viewed_at desc);

alter table public.status_updates enable row level security;
alter table public.status_update_views enable row level security;

grant select, insert, delete on public.status_updates to authenticated;
grant select, insert on public.status_update_views to authenticated;

drop policy if exists "Conversation partners can read active statuses" on public.status_updates;
create policy "Conversation partners can read active statuses"
  on public.status_updates for select to authenticated
  using (
    created_at > now() - interval '24 hours'
    and (
      owner_id = auth.uid()
      or exists (
        select 1
        from public.simple_conversations c
        where (c.user_a = auth.uid() and c.user_b = status_updates.owner_id)
           or (c.user_b = auth.uid() and c.user_a = status_updates.owner_id)
      )
    )
  );

drop policy if exists "Users can publish their own statuses" on public.status_updates;
create policy "Users can publish their own statuses"
  on public.status_updates for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Users can delete their own statuses" on public.status_updates;
create policy "Users can delete their own statuses"
  on public.status_updates for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Status owners and viewers can read view records" on public.status_update_views;
create policy "Status owners and viewers can read view records"
  on public.status_update_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.status_updates s
      where s.id = status_update_views.status_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Conversation partners can record one status view" on public.status_update_views;
create policy "Conversation partners can record one status view"
  on public.status_update_views for insert to authenticated
  with check (
    viewer_id = auth.uid()
    and exists (
      select 1 from public.status_updates s
      where s.id = status_update_views.status_id
        and s.owner_id <> auth.uid()
        and s.created_at > now() - interval '24 hours'
    )
  );

-- Opportunistically remove expired rows when a new status is published.
create or replace function public.remove_expired_status_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.status_updates where created_at <= now() - interval '24 hours';
  return new;
end;
$$;

drop trigger if exists remove_expired_status_updates_before_insert on public.status_updates;
create trigger remove_expired_status_updates_before_insert
before insert on public.status_updates
for each row execute function public.remove_expired_status_updates();
