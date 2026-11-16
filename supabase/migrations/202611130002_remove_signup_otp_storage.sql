-- SMS OTP signup has been removed; keep no verification-code storage.
drop table if exists public.signup_otps;
