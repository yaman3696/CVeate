-- Short-lived browser presence only: no user IDs, IPs, pages, CVs, or device fingerprints.
begin;
create table if not exists public.site_visitor_presence (
 visitor_hash text primary key check(length(visitor_hash)=64),
 visitor_kind text not null check(visitor_kind in ('guest','user')),
 last_seen timestamptz not null default now()
);
alter table public.site_visitor_presence enable row level security;
revoke all on public.site_visitor_presence from public,anon,authenticated;
grant select,insert,update,delete on public.site_visitor_presence to service_role;
create index if not exists site_visitor_presence_last_seen on public.site_visitor_presence(last_seen);
create or replace function public.touch_site_visitor(p_hash text,p_kind text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_kind is null or p_kind not in ('guest','user') then raise exception 'Invalid presence';end if;
 insert into public.site_visitor_presence(visitor_hash,visitor_kind,last_seen) values(p_hash,p_kind,now())
 on conflict(visitor_hash) do update set visitor_kind=excluded.visitor_kind,last_seen=excluded.last_seen;
 delete from public.site_visitor_presence where last_seen<now()-interval '15 minutes';
end $$;
create or replace function public.active_site_visitors() returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('total',count(*),'guests',count(*) filter(where visitor_kind='guest'),
 'signedIn',count(*) filter(where visitor_kind='user'),'windowSeconds',300,'asOf',now())
 from public.site_visitor_presence where last_seen>=now()-interval '5 minutes';
$$;
revoke all on function public.touch_site_visitor(text,text) from public,anon,authenticated;
revoke all on function public.active_site_visitors() from public,anon,authenticated;
grant execute on function public.touch_site_visitor(text,text) to service_role;
grant execute on function public.active_site_visitors() to service_role;
notify pgrst,'reload schema';
commit;
