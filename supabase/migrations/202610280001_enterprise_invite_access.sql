-- Explicit Enterprise access. Run after the Enterprise foundation migration.
begin;
create table if not exists public.enterprise_access_grants (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 granted_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.enterprise_access_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 user_id uuid not null, enabled boolean not null, created_at timestamptz not null default now()
);
alter table public.enterprise_access_grants enable row level security;
alter table public.enterprise_access_events enable row level security;
revoke all on public.enterprise_access_grants, public.enterprise_access_events from public,anon,authenticated,service_role;
grant select on public.enterprise_access_grants,public.enterprise_access_events to service_role;
create or replace function public.admin_set_enterprise_access(p_actor uuid,p_email text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not exists(select 1 from public.admin_permission_owners o join public.profiles p on p.id=o.user_id where o.user_id=p_actor and p.role='admin') then raise exception 'Owner access required' using errcode='42501';end if;
 if p_email is null or length(p_email)>254 or p_enabled is null then raise exception 'Invalid access request' using errcode='22023';end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) and (not p_enabled or email_confirmed_at is not null);
 if target is null then raise exception 'Use the email of an existing verified CVeat account' using errcode='22023';end if;
 if exists(select 1 from public.profiles where id=target and role='admin') then raise exception 'Active administrators already have access' using errcode='22023';end if;
 insert into public.enterprise_access_grants(user_id,enabled,granted_by) values(target,p_enabled,p_actor)
 on conflict(user_id) do update set enabled=excluded.enabled,granted_by=excluded.granted_by,updated_at=now();
 insert into public.enterprise_access_events(actor_id,user_id,enabled) values(p_actor,target,p_enabled);
 return jsonb_build_object('user_id',target,'enabled',p_enabled);
end;$$;
create or replace function public.admin_list_enterprise_access(p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_permission_owners o join public.profiles p on p.id=o.user_id where o.user_id=p_actor and p.role='admin') then raise exception 'Owner access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(g)) from (
 select a.user_id,u.email,p.full_name,a.enabled,a.updated_at from public.enterprise_access_grants a
 join auth.users u on u.id=a.user_id left join public.profiles p on p.id=a.user_id order by a.updated_at desc,a.user_id limit 100
 ) g),'[]'::jsonb);
end;$$;
revoke all on function public.admin_set_enterprise_access(uuid,text,boolean),public.admin_list_enterprise_access(uuid) from public,anon,authenticated;
grant execute on function public.admin_set_enterprise_access(uuid,text,boolean),public.admin_list_enterprise_access(uuid) to service_role;
-- Revocation must also block direct authenticated database reads of company data.
create or replace function public.is_organization_member(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members m join public.enterprise_access_grants a on a.user_id=m.user_id
 where m.organization_id=p_org and m.user_id=auth.uid() and a.enabled);
$$;
-- Service-only creation still verifies the explicit grant inside the transaction.
create or replace function public.create_enterprise_workspace(p_user uuid,p_name text,p_website text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.organizations;
begin
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'Verified identity required' using errcode='42501';end if;
 if not exists(select 1 from public.enterprise_access_grants where user_id=p_user and enabled) and not exists(select 1 from public.profiles where id=p_user and role='admin') then raise exception 'Enterprise invitation required' using errcode='42501';end if;
 if length(trim(p_name)) not between 2 and 100 or p_website !~ '^https://[^[:space:]/@]+\.[^[:space:]/@]+$' then raise exception 'Invalid company details' using errcode='22023';end if;
 insert into public.organizations(name,website,owner_id) values(trim(p_name),p_website,p_user) returning * into o;
 insert into public.organization_members values(o.id,p_user,'owner',now());
 insert into public.enterprise_events(organization_id,actor_id,action,resource_id) values(o.id,p_user,'organization.created',o.id);
 return to_jsonb(o);
end;$$;
create or replace function public.save_enterprise_job(p_user uuid,p_org uuid,p_job uuid,p_data jsonb,p_status text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare org public.organizations;j public.enterprise_jobs;
begin
 if not exists(select 1 from public.enterprise_access_grants where user_id=p_user and enabled) and not exists(select 1 from public.profiles where id=p_user and role='admin') then raise exception 'Enterprise invitation required' using errcode='42501';end if;
 select * into org from public.organizations where id=p_org for update;
 if org.id is null or not exists(select 1 from public.organization_members where organization_id=p_org and user_id=p_user and role in ('owner','admin','recruiter')) then raise exception 'Membership required' using errcode='42501';end if;
 if p_status not in ('draft','published','paused','closed') or (p_status='published' and org.status<>'verified') or org.status='suspended' then raise exception 'Verified company required' using errcode='42501';end if;
 if p_status='published' and (p_data->>'deadline')::date < (now() at time zone 'Asia/Kolkata')::date then raise exception 'Expired job' using errcode='22023';end if;
 if length(p_data->>'title') not between 1 and 150 or length(p_data->>'description') not between 1 and 15000 then raise exception 'Invalid job' using errcode='22023';end if;
 if p_job is null then
  if (select count(*) from public.enterprise_jobs where organization_id=p_org)>=100 then raise exception 'Pilot workspace job limit reached' using errcode='54000';end if;
  insert into public.enterprise_jobs(organization_id,title,description,state,city,seniority,work_mode,employment_type) values(p_org,'','','','','','','') returning * into j;
 else
  select * into j from public.enterprise_jobs where id=p_job and organization_id=p_org for update;
  if j.id is null then raise exception 'Job unavailable' using errcode='42501';end if;
  if j.version<>p_version then raise exception 'Job changed' using errcode='40001';end if;
 end if;
 update public.enterprise_jobs set title=p_data->>'title',description=p_data->>'description',state=p_data->>'state',city=p_data->>'city',seniority=p_data->>'seniority',work_mode=p_data->>'work_mode',employment_type=p_data->>'employment_type',salary_min=(p_data->>'salary_min')::integer,salary_max=(p_data->>'salary_max')::integer,experience_min=(p_data->>'experience_min')::integer,skills=array(select jsonb_array_elements_text(p_data->'skills')),deadline=(p_data->>'deadline')::date,status=p_status,version=case when p_job is null then 1 else version+1 end,updated_at=now() where id=j.id returning * into j;
 insert into public.enterprise_events(organization_id,actor_id,action,resource_id) values(p_org,p_user,'job.'||p_status,j.id);
 return to_jsonb(j);
end;$$;

drop trigger if exists enterprise_access_events_append_only on public.enterprise_access_events;
create trigger enterprise_access_events_append_only before update or delete on public.enterprise_access_events for each row execute function public.prevent_admin_audit_changes();
commit;
