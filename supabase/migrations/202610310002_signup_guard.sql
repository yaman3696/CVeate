begin;
-- Run once in Supabase SQL Editor before deploying the matching website changes.
-- Existing accounts/credit balances are preserved. Phone numbers here are unverified.
create table if not exists public.signup_guard_settings(id boolean primary key default true check(id), activated_at timestamptz not null default now());
insert into public.signup_guard_settings(id) values(true) on conflict do nothing;
create table if not exists public.signup_phone_claims(phone text primary key, user_id uuid not null unique, created_at timestamptz not null default now());
create table if not exists public.signup_accounts(user_id uuid primary key, phone text, created_at timestamptz not null default now());
create table if not exists public.signup_tickets(id uuid primary key default gen_random_uuid(),email text not null,phone text not null,expires_at timestamptz not null default now()+interval '10 minutes');
create table if not exists public.signup_rate_buckets(bucket text primary key,attempts integer not null,expires_at timestamptz not null);
create table if not exists public.signup_blocked_domains(domain text primary key);
alter table public.signup_guard_settings enable row level security;
alter table public.signup_phone_claims enable row level security;
alter table public.signup_accounts enable row level security;
alter table public.signup_tickets enable row level security;
alter table public.signup_rate_buckets enable row level security;
alter table public.signup_blocked_domains enable row level security;
revoke all on public.signup_guard_settings,public.signup_phone_claims,public.signup_accounts,public.signup_tickets,public.signup_rate_buckets,public.signup_blocked_domains from anon,authenticated;
-- Existing numbers are reserved without changing profiles or resolving historical duplicates.
insert into public.signup_phone_claims(phone,user_id)
select distinct on (phone) phone,id from (
select id,coalesce(contact_number::text,phone::text) phone,created_at from public.profiles
) p where phone ~ '^[6-9][0-9]{9}$' order by phone,created_at,id on conflict do nothing;

create or replace function public.signup_valid_mobile(p_phone text) returns boolean language sql immutable set search_path='' as $$
select coalesce(p_phone ~ '^[6-9][0-9]{9}$' and p_phone !~ '^([0-9])\1{9}$',false)
$$;
create or replace function public.signup_disposable_email(p_email text) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.signup_blocked_domains where split_part(lower(p_email),'@',2)=domain or right(split_part(lower(p_email),'@',2),length(domain)+1)='.'||domain)
$$;

create or replace function public.prepare_signup(p_email text,p_phone text,p_network text,p_browser text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer; ticket uuid; k text; cap integer; expiry timestamptz;
begin
 delete from public.signup_tickets where expires_at<now();
 delete from public.signup_rate_buckets where expires_at<now();
 if length(p_network)<>64 or length(p_browser)<>64 then return jsonb_build_object('error','Invalid signup request.','status',400);end if;
 -- Hashes contain no raw IP address. A shared network has a higher allowance than a browser.
 for k,cap,expiry in select 'network-hour:'||p_network,20,now()+interval '1 hour' union all select 'network-day:'||p_network,100,now()+interval '24 hours' union all select 'browser-day:'||p_browser,5,now()+interval '24 hours' loop
 insert into public.signup_rate_buckets(bucket,attempts,expires_at) values(k,1,expiry)
 on conflict(bucket) do update set attempts=public.signup_rate_buckets.attempts+1 returning attempts into n;
 if n>cap then return jsonb_build_object('error','Too many signup attempts. Please try again later or contact support@cveat.in.','status',429);end if;
 end loop;
 if not public.signup_valid_mobile(p_phone) then return jsonb_build_object('error','Enter a valid 10-digit Indian mobile number.','status',400);end if;
 if length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return jsonb_build_object('error','Enter a valid email address.','status',400);end if;
 if public.signup_disposable_email(p_email) then return jsonb_build_object('error','Please use a permanent email address. Temporary email addresses are not accepted.','status',400);end if;
 if exists(select 1 from public.signup_phone_claims where phone=p_phone) then return jsonb_build_object('error','This mobile number is already linked to an account. Please sign in or contact support@cveat.in.','status',409);end if;
 insert into public.signup_tickets(email,phone) values(lower(trim(p_email)),p_phone) returning id into ticket;
 return jsonb_build_object('ticket',ticket);
end $$;

create or replace function public.enforce_signup_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare v_phone text; found_ticket uuid;
begin
 -- Employee invitations are created only by the trusted Supabase admin API.
 if new.invited_at is not null then return new;end if;
 if public.signup_disposable_email(new.email) then raise exception 'Use a permanent email address' using errcode='P0001';end if;
 v_phone:=new.raw_user_meta_data->>'contact_number';
 if coalesce(new.raw_app_meta_data->>'provider','email')='email' then
 if not public.signup_valid_mobile(v_phone) then raise exception 'A valid 10-digit mobile number is required' using errcode='P0001';end if;
 delete from public.signup_tickets where id::text=new.raw_user_meta_data->>'signup_ticket' and email=lower(trim(new.email)) and public.signup_tickets.phone=v_phone and expires_at>now() returning id into found_ticket;
 if found_ticket is null then raise exception 'Complete signup through the CVeat signup form' using errcode='P0001';end if;
 begin insert into public.signup_phone_claims(phone,user_id) values(v_phone,new.id);
 exception when unique_violation then raise exception 'This mobile number is already linked to an account' using errcode='P0001';end;
 else v_phone:=null;end if;
 insert into public.signup_accounts(user_id,phone) values(new.id,v_phone);
 return new;
end $$;
drop trigger if exists cveat_signup_guard on auth.users;
create trigger cveat_signup_guard before insert on auth.users for each row execute function public.enforce_signup_guard();

create or replace function public.signup_access_status(p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare account public.signup_accounts; confirmed boolean;
begin
 select * into account from public.signup_accounts where user_id=p_user;
 if not found then return jsonb_build_object('ready',true,'needsMobile',false,'needsEmail',false);end if;
 select email_confirmed_at is not null into confirmed from auth.users where id=p_user;
 return jsonb_build_object('ready',account.phone is not null and coalesce(confirmed,false),'needsMobile',account.phone is null,'needsEmail',not coalesce(confirmed,false));
end $$;
create or replace function public.complete_signup_phone(p_user uuid,p_phone text,p_network text,p_browser text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.signup_accounts; email text; result jsonb;
begin
 select * into a from public.signup_accounts where user_id=p_user for update;
 if not found or a.phone is not null then return public.signup_access_status(p_user);end if;
 select u.email into email from auth.users u where id=p_user;
 result:=public.prepare_signup(email,p_phone,p_network,p_browser);
 if result ? 'error' then return result;end if;
 begin insert into public.signup_phone_claims(phone,user_id) values(p_phone,p_user);
 exception when unique_violation then return jsonb_build_object('error','This mobile number is already linked to an account. Please sign in or contact support@cveat.in.','status',409);end;
 update public.signup_accounts set phone=p_phone where user_id=p_user;
 update public.profiles set contact_number=p_phone::bigint,phone=p_phone::bigint where id=p_user;
 delete from public.signup_tickets where id::text=result->>'ticket';
 return public.signup_access_status(p_user);
end $$;
-- Block direct RPC calls as well as website requests while a new signup is incomplete.
create or replace function public.require_complete_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not (public.signup_access_status(new.user_id)->>'ready')::boolean then raise exception 'Complete mobile signup and verify your email before using AI credits' using errcode='42501';end if;
 return new;
end $$;
drop trigger if exists cveat_credit_signup_guard on public.career_credit_transactions;
create trigger cveat_credit_signup_guard before insert on public.career_credit_transactions for each row execute function public.require_complete_signup();
drop trigger if exists cveat_interview_signup_guard on public.practice_interviews;
create trigger cveat_interview_signup_guard before insert on public.practice_interviews for each row execute function public.require_complete_signup();
-- The existing credit-grant routine remains responsible for granting credits. Prevent a
-- second trial grant for the same account, including concurrent requests.
create or replace function public.guard_duplicate_trial_grant() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.grant_type='trial' then
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,731));
 if exists(select 1 from public.cveate_credit_grants where user_id=new.user_id and grant_type='trial' and id<>new.id) then return null;end if;
 end if;return new;
end $$;
drop trigger if exists cveat_one_trial_grant on public.cveate_credit_grants;
create trigger cveat_one_trial_grant before insert or update of user_id,grant_type on public.cveate_credit_grants for each row execute function public.guard_duplicate_trial_grant();
revoke all on function public.prepare_signup(text,text,text,text),public.signup_access_status(uuid),public.complete_signup_phone(uuid,text,text,text),public.enforce_signup_guard(),public.require_complete_signup(),public.guard_duplicate_trial_grant(),public.signup_disposable_email(text) from public,anon,authenticated;
grant execute on function public.prepare_signup(text,text,text,text),public.signup_access_status(uuid),public.complete_signup_phone(uuid,text,text,text) to service_role;
insert into public.signup_blocked_domains(domain) values ('mailinator.com'),('guerrillamail.com'),('guerrillamail.net'),('guerrillamail.org'),('guerrillamail.de'),('sharklasers.com'),('grr.la'),('guerrillamailblock.com'),('pokemail.net'),('spam4.me'),('yopmail.com'),('yopmail.fr'),('yopmail.net'),('tempmail.com'),('temp-mail.org'),('temp-mail.io'),('10minutemail.com'),('10minutemail.net'),('throwawaymail.com'),('getnada.com'),('dispostable.com'),('maildrop.cc'),('mohmal.com'),('moakt.com') on conflict do nothing;
commit;
