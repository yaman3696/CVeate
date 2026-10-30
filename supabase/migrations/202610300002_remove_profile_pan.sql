-- Permanently removes PAN values from the active profiles table. No CASCADE: dependencies must be reviewed explicitly.
begin;
alter table public.profiles drop column if exists pan_number;
notify pgrst, 'reload schema';
commit;
