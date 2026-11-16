create table if not exists public.signup_otps (
  phone_e164 text primary key check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now()
);

alter table public.signup_otps enable row level security;
revoke all on public.signup_otps from anon, authenticated;

create index if not exists signup_otps_expiry_idx on public.signup_otps (expires_at);

