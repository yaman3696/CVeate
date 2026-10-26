-- Run AFTER the Audit Logs setup, BEFORE installing this update.
-- If you have multiple administrators, set owner_id below to YOUR user UUID.
-- With exactly one existing administrator, that administrator is selected automatically.
begin;
create table if not exists public.admin_permission_owners (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table if not exists public.admin_permission_sets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  permissions text[] not null default '{}',
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint admin_permission_keys_check check (permissions <@ array[
    'overview.read','users.read','revenue.read','ai_economics.read','audit.read',
    'blog.read','blog.create','blog.update','blog.delete','blog.publish'
  ]::text[])
);
alter table public.admin_permission_owners enable row level security;
alter table public.admin_permission_sets enable row level security;
revoke all on public.admin_permission_owners from public, anon, authenticated, service_role;
revoke all on public.admin_permission_sets from public, anon, authenticated, service_role;
grant select on public.admin_permission_owners to service_role;
grant select, insert, update on public.admin_permission_sets to service_role;

-- Bootstrap only once. Running the migration again never restores revoked grants.
do $$
declare
  owner_id uuid := null; -- Multiple admins? Replace null with 'YOUR-USER-UUID'::uuid.
  admin_count integer;
begin
  if not exists (select 1 from public.admin_permission_owners) then
    if owner_id is null then
      select count(*) into admin_count from public.profiles where role = 'admin';
      if admin_count <> 1 then
        raise exception 'Set owner_id to your admin UUID near the top of the setup block, then run the entire script again.';
      end if;
      select id into owner_id from public.profiles where role = 'admin';
    end if;
    if not exists (select 1 from public.profiles where id = owner_id and role = 'admin') then
      raise exception 'The selected owner must already have the admin role.';
    end if;
    insert into public.admin_permission_owners(user_id) values (owner_id);
    -- Preserve current section/action access for existing admins at initial setup.
    insert into public.admin_permission_sets(user_id, permissions)
    select id, array['overview.read','users.read','revenue.read','ai_economics.read','audit.read','blog.read','blog.create','blog.update','blog.delete','blog.publish']::text[]
    from public.profiles where role = 'admin'
    on conflict (user_id) do nothing;
  end if;
end;
$$;

alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check check (action in ('blog.created','blog.updated','blog.deleted','permissions.updated'));
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_resource_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_resource_type_check check (resource_type in ('blog','admin'));

-- Permission edits and their audit event commit together or both roll back.
create or replace function public.set_admin_permissions(
  p_actor_id uuid, p_target_id uuid, p_permissions text[], p_expected_version bigint
) returns jsonb language plpgsql security invoker set search_path = '' as $$
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
  -- Serialize updates to this admin, including the first permission assignment.
  perform id from public.profiles where id=p_target_id and role='admin' for update;
  if not found then raise exception using errcode='22023', message='Target must already be an administrator'; end if;
  insert into public.admin_permission_sets(user_id) values (p_target_id) on conflict (user_id) do nothing;
  select permissions, version into old_permissions, old_version from public.admin_permission_sets where user_id=p_target_id for update;
  if old_version<>p_expected_version then raise exception using errcode='40001', message='Permissions changed. Refresh before saving.'; end if;
  next_version := old_version+1;
  update public.admin_permission_sets set permissions=p_permissions, version=next_version, updated_at=now() where user_id=p_target_id;
  insert into public.admin_audit_logs(actor_id,action,resource_type,resource_id,summary,metadata)
  values (p_actor_id,'permissions.updated','admin',p_target_id::text,'Administrator permissions updated',jsonb_build_object('previousPermissions',old_permissions,'permissions',p_permissions));
  return jsonb_build_object('version',next_version);
end;
$$;
revoke all on function public.set_admin_permissions(uuid,uuid,text[],bigint) from public, anon, authenticated;
grant execute on function public.set_admin_permissions(uuid,uuid,text[],bigint) to service_role;
commit;
