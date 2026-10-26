-- Run once in Supabase SQL Editor. Does not modify existing application tables.
begin;
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null check (action in ('blog.created', 'blog.updated', 'blog.deleted')),
  resource_type text not null default 'blog' check (resource_type = 'blog'),
  resource_id text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc, id);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs (action, created_at desc);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from public, anon, authenticated;
revoke all on public.admin_audit_logs from service_role;
grant select, insert on public.admin_audit_logs to service_role;

create or replace function public.prevent_admin_audit_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Admin audit records are append-only';
end;
$$;
revoke all on function public.prevent_admin_audit_changes() from public, anon, authenticated;
drop trigger if exists admin_audit_logs_append_only on public.admin_audit_logs;
create trigger admin_audit_logs_append_only before update or delete on public.admin_audit_logs
for each row execute function public.prevent_admin_audit_changes();
commit;
