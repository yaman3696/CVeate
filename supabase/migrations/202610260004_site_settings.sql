-- Run after admin audit, permissions and employee migrations. Rerunnable.
begin;
create table if not exists public.site_brand_assets (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('logo','darkLogo','footerLogo','favicon','shareImage')),
 content text not null check(length(content) between 1 and 1398104),
 mime text not null check(mime='image/png'),
 width integer not null check(width between 1 and 1600),
 height integer not null check(height between 1 and 900),
 created_by uuid not null,
 created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
 id integer primary key check(id=1), data jsonb not null check(jsonb_typeof(data)='object'),
 version integer not null default 1 check(version>0), updated_at timestamptz not null default now()
);
create table if not exists public.site_settings_history (
 id uuid primary key default gen_random_uuid(), version integer unique not null,
 data jsonb not null, actor_id uuid, restored_from uuid references public.site_settings_history(id),
 created_at timestamptz not null default now()
);
alter table public.site_brand_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_settings_history enable row level security;
revoke all on public.site_brand_assets,public.site_settings,public.site_settings_history from public,anon,authenticated,service_role;
grant select,insert on public.site_brand_assets to service_role;
grant select on public.site_settings,public.site_settings_history to service_role;
-- Published settings and immutable raster files are delivered through explicit public API projections.

insert into public.site_settings(id,data) values (1,'{"companyName":"CVeat","supportEmail":"support@cveat.in","phone":"+91 8826733504","address":"CVeat Headquarters\nMayur Vihar Phase 1\nNew Delhi, Delhi, 110001, India","logo":"","darkLogo":"","footerLogo":"","favicon":"","shareImage":"","seoTitle":"Cveat | AI Resume Builder & ATS Checker","seoDescription":"Build professional resumes, check ATS compatibility, and prepare for job interviews with Cveat. Your AI-powered career companion.","social":{"linkedin":"","instagram":"","facebook":"","youtube":"","x":""}}'::jsonb) on conflict(id) do nothing;
insert into public.site_settings_history(version,data) select version,data from public.site_settings where id=1 on conflict(version) do nothing;

drop trigger if exists site_settings_history_append_only on public.site_settings_history;
create trigger site_settings_history_append_only before update or delete on public.site_settings_history for each row execute function public.prevent_admin_audit_changes();
-- Asset URLs remain valid for restored versions and use immutable browser caching.
drop trigger if exists site_brand_assets_append_only on public.site_brand_assets;
create trigger site_brand_assets_append_only before update or delete on public.site_brand_assets for each row execute function public.prevent_admin_audit_changes();

alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check check(action in (
 'blog.created','blog.updated','blog.deleted','permissions.updated','employee.invited','employee.accepted',
 'employee.suspended','employee.restored','employee.revoked','employee.email_requested','employee.email_sent','employee.email_failed','employee.delete_requested','employee.deleted','settings.published','settings.restored'
));
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_resource_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_resource_type_check check(resource_type in ('blog','admin','employee','settings'));

create or replace function public.publish_site_settings(p_actor uuid,p_version integer,p_data jsonb,p_restored_from uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.site_settings; old_data jsonb; changed text[];
begin
 if not exists(select 1 from public.admin_permission_owners o join public.profiles p on p.id=o.user_id where o.user_id=p_actor and p.role='admin') then
  raise exception 'Owner required' using errcode='42501';
 end if;
 select * into current_row from public.site_settings where id=1 for update;
 if current_row.version is distinct from p_version then raise exception 'Settings changed' using errcode='40001'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>20000 then raise exception 'Invalid settings' using errcode='22023'; end if;
 if p_restored_from is not null then
  select data into old_data from public.site_settings_history where id=p_restored_from;
  if old_data is null or old_data<>p_data then raise exception 'Saved version mismatch' using errcode='22023'; end if;
 end if;
 select array_agg(key order by key) into changed from jsonb_each(p_data) where value is distinct from current_row.data->key;
 update public.site_settings set data=p_data,version=version+1,updated_at=now() where id=1 returning * into current_row;
 insert into public.site_settings_history(version,data,actor_id,restored_from) values(current_row.version,p_data,p_actor,p_restored_from);
 insert into public.admin_audit_logs(actor_id,action,resource_type,resource_id,summary,metadata)
 values(p_actor,case when p_restored_from is null then 'settings.published' else 'settings.restored' end,'settings','website','Published website settings version '||current_row.version,jsonb_build_object('version',current_row.version,'changed_fields',coalesce(changed,array[]::text[]),'restored_from',p_restored_from));
 return jsonb_build_object('data',current_row.data,'version',current_row.version,'updated_at',current_row.updated_at);
end;
$$;
revoke all on function public.publish_site_settings(uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.publish_site_settings(uuid,integer,jsonb,uuid) to service_role;
commit;
