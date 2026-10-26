-- Requires the previous Audit Logs and Permissions migrations.
-- Run BEFORE deploying employee-management code. Never emails anyone by itself.
begin;
-- There can be only one owner/personal-email exception.
create unique index if not exists admin_single_owner on public.admin_permission_owners ((true));
create table if not exists public.admin_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text not null,
  email text not null unique check (email=lower(email) and email ~ '^[a-z0-9][a-z0-9._+-]*@cveat\.in$'),
  job_title text not null default '',
  status text not null check (status in ('invited','active','suspended','revoked','deleting','deleted')),
  accepted_at timestamptz,
  last_email_attempt_at timestamptz,
  last_email_sent_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_employees enable row level security;
revoke all on public.admin_employees from public,anon,authenticated,service_role;
grant select,insert,update on public.admin_employees to service_role;

alter table public.admin_audit_logs drop constraint admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check check (action in (
 'blog.created','blog.updated','blog.deleted','permissions.updated','employee.invited','employee.accepted',
 'employee.suspended','employee.restored','employee.revoked','employee.email_requested','employee.email_sent','employee.email_failed','employee.delete_requested','employee.deleted'
));
alter table public.admin_audit_logs drop constraint admin_audit_logs_resource_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_resource_type_check check (resource_type in ('blog','admin','employee'));

-- Existing corporate admins are adopted; other non-owner accounts cannot be staff.
insert into public.admin_employees(user_id,full_name,email,status,accepted_at)
select p.id,coalesce(p.full_name,''),lower(u.email),'active',now()
from public.profiles p join auth.users u on u.id=p.id
where p.role='admin' and lower(u.email) ~ '^[a-z0-9][a-z0-9._+-]*@cveat\.in$'
 and not exists(select 1 from public.admin_permission_owners o where o.user_id=p.id)
on conflict do nothing;

-- Remove legacy personal-email admin roles except the designated owner.
update public.profiles p set role='user'
where p.role='admin' and not exists(select 1 from public.admin_permission_owners o where o.user_id=p.id)
 and not exists(select 1 from public.admin_employees e where e.user_id=p.id and e.status='active');

create or replace function public.admin_employee_event(p_actor uuid,p_employee uuid,p_action text,p_metadata jsonb default '{}'::jsonb)
returns void language sql security invoker set search_path='' as $$
 insert into public.admin_audit_logs(actor_id,action,resource_type,resource_id,summary,metadata)
 values(p_actor,p_action,'employee',p_employee::text,p_action,p_metadata);
$$;
revoke all on function public.admin_employee_event(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_employee_event(uuid,uuid,text,jsonb) to service_role;

create or replace function public.admin_employee_control(
 p_actor uuid,p_action text,p_employee uuid default null,p_user uuid default null,
 p_email text default null,p_name text default '',p_title text default '',
 p_permissions text[] default null,p_version bigint default 1
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 e public.admin_employees%rowtype;
 old_permissions text[];
 allowed constant text[]:=array['overview.read','users.read','revenue.read','ai_economics.read','audit.read','blog.read','blog.create','blog.update','blog.delete','blog.publish'];
begin
 if not exists(select 1 from public.admin_permission_owners o join public.profiles p on p.id=o.user_id where o.user_id=p_actor and p.role='admin') then raise exception using errcode='42501',message='Owner required'; end if;
 if p_permissions is not null and (not(p_permissions <@ allowed) or array_position(p_permissions,null) is not null or cardinality(p_permissions)>10 or (p_permissions && array['blog.create','blog.update','blog.delete','blog.publish']::text[] and not('blog.read'=any(p_permissions)))) then raise exception using errcode='22023',message='Invalid permissions'; end if;
 if p_action='invite' then
  if p_email is null or p_email<>lower(p_email) or p_email !~ '^[a-z0-9][a-z0-9._+-]*@cveat\.in$' or length(p_name)<1 or length(p_name)>100 or length(p_title)>100 or p_permissions is null then raise exception using errcode='22023',message='Invalid employee'; end if;
  if p_user=p_actor or exists(select 1 from public.admin_permission_owners where user_id=p_user) then raise exception using errcode='42501',message='Owner protected'; end if;
  perform id from public.profiles where id=p_user and role is distinct from 'admin' for update;
  if not found then raise exception using errcode='22023',message='A new employee account is required'; end if;
  insert into public.admin_employees(user_id,full_name,email,job_title,status) values(p_user,p_name,p_email,p_title,'invited') returning * into e;
  insert into public.admin_permission_sets(user_id,permissions) values(p_user,p_permissions) on conflict(user_id) do update set permissions=excluded.permissions,version=public.admin_permission_sets.version+1,updated_at=now();
  perform public.admin_employee_event(p_actor,e.id,'employee.invited',jsonb_build_object('email',e.email,'permissions',p_permissions));
  return to_jsonb(e);
 end if;
 select * into e from public.admin_employees where id=p_employee for update;
 if not found then raise exception using errcode='22023',message='Employee not found'; end if;
 if e.user_id=p_actor or exists(select 1 from public.admin_permission_owners where user_id=e.user_id) then raise exception using errcode='42501',message='Owner protected'; end if;
 if e.version<>p_version then raise exception using errcode='40001',message='Employee changed. Refresh before retrying'; end if;
 if e.status='deleted' then raise exception using errcode='22023',message='Account already deleted'; end if;
 if e.status='deleting' and p_action not in ('delete','deleted') then raise exception using errcode='22023',message='Deletion is in progress'; end if;
 if p_action='permissions' then
  if p_permissions is null then raise exception using errcode='22023',message='Permissions required'; end if;
  select permissions into old_permissions from public.admin_permission_sets where user_id=e.user_id for update;
  insert into public.admin_permission_sets(user_id,permissions) values(e.user_id,p_permissions) on conflict(user_id) do update set permissions=excluded.permissions,version=public.admin_permission_sets.version+1,updated_at=now();
  perform public.admin_employee_event(p_actor,e.id,'permissions.updated',jsonb_build_object('previousPermissions',old_permissions,'permissions',p_permissions));
 elsif p_action='suspend' then
  if e.status not in ('active','invited') then raise exception using errcode='22023',message='Cannot suspend this employee'; end if;
  e.status:='suspended';
 elsif p_action='restore' then
  if e.status not in ('suspended','revoked') then raise exception using errcode='22023',message='Cannot restore this employee'; end if;
  e.status:=case when e.accepted_at is null then 'invited' else 'active' end;
 elsif p_action='revoke' then
  e.status:='revoked';
  update public.admin_permission_sets set permissions='{}',version=version+1,updated_at=now() where user_id=e.user_id;
 elsif p_action='delete' then
  if exists(select 1 from public.cveate_credit_purchases where user_id=e.user_id) then raise exception using errcode='22023',message='Purchase history exists. Remove admin access instead'; end if;
  e.status:='deleting';
  update public.admin_permission_sets set permissions='{}',version=version+1,updated_at=now() where user_id=e.user_id;
 elsif p_action='deleted' then
  if e.status<>'deleting' or exists(select 1 from auth.users where id=e.user_id) then raise exception using errcode='22023',message='Login deletion has not completed'; end if;
  e.status:='deleted';
 elsif p_action='email' then
  if e.status<>'invited' then raise exception using errcode='22023',message='Only pending invitations can be resent'; end if;
  if e.last_email_attempt_at>now()-interval '60 seconds' then raise exception using errcode='22023',message='Wait one minute before resending'; end if;
  e.last_email_attempt_at:=now();
 elsif p_action='email_sent' then e.last_email_sent_at:=now();
 elsif p_action<>'email_failed' then raise exception using errcode='22023',message='Invalid action';
 end if;
 update public.admin_employees set status=e.status,last_email_attempt_at=e.last_email_attempt_at,last_email_sent_at=e.last_email_sent_at,version=version+1,updated_at=now() where id=e.id returning * into e;
 update public.profiles set role=case when e.status='active' then 'admin' else 'user' end where id=e.user_id;
 if p_action<>'permissions' then
  perform public.admin_employee_event(p_actor,e.id,case p_action when 'suspend' then 'employee.suspended' when 'restore' then 'employee.restored' when 'revoke' then 'employee.revoked' when 'delete' then 'employee.delete_requested' when 'deleted' then 'employee.deleted' when 'email' then 'employee.email_requested' when 'email_sent' then 'employee.email_sent' else 'employee.email_failed' end,jsonb_build_object('status',e.status,'userId',e.user_id,'email',e.email));
 end if;
 return to_jsonb(e);
end;
$$;
revoke all on function public.admin_employee_control(uuid,text,uuid,uuid,text,text,text,text[],bigint) from public,anon,authenticated;
grant execute on function public.admin_employee_control(uuid,text,uuid,uuid,text,text,text,text[],bigint) to service_role;

create or replace function public.accept_admin_employee(p_user uuid,p_email text)
returns void language plpgsql security invoker set search_path='' as $$
declare e public.admin_employees%rowtype;
begin
 select * into e from public.admin_employees where user_id=p_user for update;
 if not found or e.email<>p_email or e.status not in ('invited','active') then raise exception using errcode='42501',message='Invitation is no longer active'; end if;
 if e.status='active' then return; end if;
 update public.profiles set role='admin' where id=p_user;
 if not found then raise exception using errcode='22023',message='Employee profile not found'; end if;
 update public.admin_employees set status='active',accepted_at=now(),version=version+1,updated_at=now() where id=e.id;
 perform public.admin_employee_event(p_user,e.id,'employee.accepted',jsonb_build_object('email',e.email));
end;
$$;
revoke all on function public.accept_admin_employee(uuid,text) from public,anon,authenticated;
grant execute on function public.accept_admin_employee(uuid,text) to service_role;

-- Serialize purchase creation with deletion claims; never delete employee purchase history.
create or replace function public.protect_employee_purchase() returns trigger language plpgsql security definer set search_path='' as $$
declare state text;
begin
 select status into state from public.admin_employees where user_id=new.user_id for share;
 if state in ('deleting','deleted') then raise exception 'Employee deletion is in progress'; end if;
 return new;
end;
$$;
revoke all on function public.protect_employee_purchase() from public,anon,authenticated;
drop trigger if exists protect_employee_purchase on public.cveate_credit_purchases;
create trigger protect_employee_purchase before insert on public.cveate_credit_purchases for each row execute function public.protect_employee_purchase();
create or replace function public.protect_employee_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.admin_permission_owners where user_id=old.id) then raise exception 'Owner login is protected'; end if;
 if exists(select 1 from public.admin_employees where user_id=old.id) and exists(select 1 from public.cveate_credit_purchases where user_id=old.id) then raise exception 'Employee has purchase records'; end if;
 return old;
end;
$$;
revoke all on function public.protect_employee_identity() from public,anon,authenticated;
drop trigger if exists protect_employee_identity on auth.users;
create trigger protect_employee_identity before delete on auth.users for each row execute function public.protect_employee_identity();
create or replace function public.set_admin_permissions(
  p_actor_id uuid, p_target_id uuid, p_permissions text[], p_expected_version bigint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  old_permissions text[];
  old_version bigint;
  next_version bigint;
  allowed constant text[] := array['overview.read','users.read','revenue.read','ai_economics.read','audit.read','blog.read','blog.create','blog.update','blog.delete','blog.publish'];
begin
  if not exists (select 1 from public.admin_permission_owners o join public.profiles p on p.id=o.user_id where o.user_id=p_actor_id and p.role='admin') then
    raise exception using errcode='42501', message='Owner access required';
  end if;
  if p_actor_id=p_target_id or exists (select 1 from public.admin_permission_owners where user_id=p_target_id) then
    raise exception using errcode='42501', message='Owner permissions cannot be changed here';
  end if;
  if p_permissions is null or array_position(p_permissions, null) is not null or not (p_permissions <@ allowed) or cardinality(p_permissions)>10 then
    raise exception using errcode='22023', message='Invalid permission keys';
  end if;
  if p_permissions && array['blog.create','blog.update','blog.delete','blog.publish']::text[] and not ('blog.read'=any(p_permissions)) then
    raise exception using errcode='22023', message='Article actions require article viewing';
  end if;
  perform id from public.admin_employees where user_id=p_target_id and status='active' for update;
  if not found then raise exception using errcode='22023',message='Employee must have active corporate access'; end if;
  -- Serialize updates to this admin, including the first permission assignment.
  perform id from public.profiles where id=p_target_id and role='admin' for update;
  if not found then raise exception using errcode='22023', message='Target must already be an administrator'; end if;
  insert into public.admin_permission_sets(user_id) values (p_target_id) on conflict (user_id) do nothing;
  select permissions, version into old_permissions, old_version from public.admin_permission_sets where user_id=p_target_id for update;
  if old_version<>p_expected_version then raise exception using errcode='40001', message='Permissions changed. Refresh before saving.'; end if;
  update public.admin_employees set version=version+1,updated_at=now() where user_id=p_target_id;
  next_version := old_version+1;
  update public.admin_permission_sets set permissions=p_permissions, version=next_version, updated_at=now() where user_id=p_target_id;
  insert into public.admin_audit_logs(actor_id,action,resource_type,resource_id,summary,metadata)
  values (p_actor_id,'permissions.updated','admin',p_target_id::text,'Administrator permissions updated',jsonb_build_object('previousPermissions',old_permissions,'permissions',p_permissions));
  return jsonb_build_object('version',next_version);
end;
$$;

commit;
