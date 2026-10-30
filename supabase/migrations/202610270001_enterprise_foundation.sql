-- Enterprise foundation: additive tables only. Run after existing admin permission setup.
begin;
create table if not exists public.organizations (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 100),website text not null,
 owner_id uuid not null unique references auth.users(id),status text not null default 'pending_verification' check(status in ('pending_verification','verified','suspended')),
 created_at timestamptz not null default now()
);
create table if not exists public.organization_members (
 organization_id uuid not null references public.organizations(id),user_id uuid not null references auth.users(id) on delete cascade,role text not null check(role in ('owner','admin','recruiter','interviewer')),
 primary key(organization_id,user_id),created_at timestamptz not null default now()
);
create table if not exists public.enterprise_jobs (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),title text not null,description text not null,
 state text not null,city text not null default '',seniority text not null,work_mode text not null,employment_type text not null,
 salary_min integer check(salary_min>=0),salary_max integer check(salary_max>=0),experience_min integer not null default 0 check(experience_min between 0 and 50),skills text[] not null default '{}',
 deadline date,status text not null default 'draft' check(status in ('draft','published','paused','closed')),version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(salary_min is null or salary_max is null or salary_min<=salary_max)
);
create index if not exists enterprise_jobs_public_idx on public.enterprise_jobs(status,state,created_at desc);
create index if not exists organization_members_user_idx on public.organization_members(user_id);
create table if not exists public.enterprise_events(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),actor_id uuid not null,action text not null,resource_id uuid,created_at timestamptz not null default now());
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.enterprise_jobs enable row level security;
alter table public.enterprise_events enable row level security;
revoke all on public.organizations,public.organization_members,public.enterprise_jobs,public.enterprise_events from public,anon,authenticated,service_role;
grant select on public.organizations,public.organization_members,public.enterprise_jobs,public.enterprise_events to service_role;
-- Public listings are served by a server API with explicit safe projections. No public table reads.
create or replace function public.is_organization_member(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members where organization_id=p_org and user_id=auth.uid());
$$;
revoke all on function public.is_organization_member(uuid) from public,anon;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant select(id,name,website,status,owner_id,created_at) on public.organizations to authenticated;
grant select on public.enterprise_jobs to authenticated;
drop policy if exists organization_member_read on public.organizations;
create policy organization_member_read on public.organizations for select to authenticated using(public.is_organization_member(id));
drop policy if exists organization_jobs_read on public.enterprise_jobs;
create policy organization_jobs_read on public.enterprise_jobs for select to authenticated using(public.is_organization_member(organization_id));

create or replace function public.create_enterprise_workspace(p_user uuid,p_name text,p_website text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.organizations;
begin
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'Verified identity required' using errcode='42501';end if;
 if length(trim(p_name)) not between 2 and 100 or p_website !~ '^https://[^[:space:]/@]+\.[^[:space:]/@]+$' then raise exception 'Invalid company details' using errcode='22023';end if;
 insert into public.organizations(name,website,owner_id) values(trim(p_name),p_website,p_user) returning * into o;
 insert into public.organization_members values(o.id,p_user,'owner',now());
 insert into public.enterprise_events(organization_id,actor_id,action,resource_id) values(o.id,p_user,'organization.created',o.id);
 return to_jsonb(o);
end;$$;

create or replace function public.save_enterprise_job(p_user uuid,p_org uuid,p_job uuid,p_data jsonb,p_status text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare org public.organizations;j public.enterprise_jobs;
begin
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

create or replace function public.verify_enterprise_workspace(p_actor uuid,p_org uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_permission_owners o join public.profiles p on p.id=o.user_id where o.user_id=p_actor and p.role='admin') then raise exception 'Owner required' using errcode='42501';end if;
 if p_status not in ('verified','suspended','pending_verification') then raise exception 'Invalid status' using errcode='22023';end if;
 perform 1 from public.organizations where id=p_org for update;if not found then raise exception 'Company unavailable' using errcode='22023';end if;
 update public.organizations set status=p_status where id=p_org;
 if p_status<>'verified' then update public.enterprise_jobs set status='paused',version=version+1,updated_at=now() where organization_id=p_org and status='published';end if;
 insert into public.enterprise_events(organization_id,actor_id,action,resource_id) values(p_org,p_actor,'organization.'||p_status,p_org);
end;$$;
revoke all on function public.create_enterprise_workspace(uuid,text,text),public.save_enterprise_job(uuid,uuid,uuid,jsonb,text,integer),public.verify_enterprise_workspace(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_enterprise_workspace(uuid,text,text),public.save_enterprise_job(uuid,uuid,uuid,jsonb,text,integer),public.verify_enterprise_workspace(uuid,uuid,text) to service_role;
drop trigger if exists enterprise_events_append_only on public.enterprise_events;
create trigger enterprise_events_append_only before update or delete on public.enterprise_events for each row execute function public.prevent_admin_audit_changes();
commit;
