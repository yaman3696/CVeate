begin;
create table if not exists public.practice_interviews (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,role text not null,seniority text not null,
 context text not null default '',plan jsonb not null default '[]',questions jsonb not null default '[]',answers jsonb not null default '[]',acknowledgement text not null default '',
 status text not null default 'generating' check(status in ('generating','active','processing','completed','failed')),version integer not null default 1,
 claim_id uuid,claimed_at timestamptz,pending_answer text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists practice_interviews_user_created on public.practice_interviews(user_id,created_at desc);
create table if not exists public.practice_ai_calls(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,kind text not null default 'turn' check(kind in ('start','turn','audio')),created_at timestamptz not null default now());
create index if not exists practice_ai_calls_user_created on public.practice_ai_calls(user_id,created_at desc);
alter table public.practice_interviews enable row level security;
alter table public.practice_ai_calls enable row level security;
revoke all on public.practice_interviews,public.practice_ai_calls from public,anon,authenticated,service_role;
grant select,update,delete on public.practice_interviews to service_role;
grant select on public.practice_ai_calls to service_role;
create or replace function public.reserve_practice_interview(p_user uuid,p_id uuid,p_role text,p_seniority text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.practice_interviews; credits integer;profile_role text;
begin
 select career_credits,role into credits,profile_role from public.profiles where id=p_user for update;
 if not found then raise exception 'Profile required' using errcode='42501';end if;
 select * into s from public.practice_interviews where id=p_id;
 if s.id is not null then if s.user_id<>p_user then raise exception 'Session unavailable' using errcode='42501';end if;return to_jsonb(s)||jsonb_build_object('existing',true);end if;
 if profile_role<>'admin' and coalesce(credits,0)<1 then raise exception 'Career Credit required for final report' using errcode='P0002';end if;
 if (select count(*) from public.practice_ai_calls where user_id=p_user and kind='start' and created_at>now()-interval '24 hours')>=5 then raise exception 'Daily practice limit reached' using errcode='54000';end if;
 if length(p_role) not between 1 and 100 or length(p_seniority) not between 1 and 40 then raise exception 'Invalid role' using errcode='22023';end if;
 insert into public.practice_interviews(id,user_id,role,seniority) values(p_id,p_user,p_role,p_seniority) returning * into s;
 insert into public.practice_ai_calls(user_id,kind) values(p_user,'start');
 return to_jsonb(s)||jsonb_build_object('existing',false);
end;$$;
create or replace function public.claim_practice_turn(p_user uuid,p_id uuid,p_version integer,p_answer text,p_claim uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.practice_interviews;
begin
 perform 1 from public.profiles where id=p_user for update;
 select * into s from public.practice_interviews where id=p_id and user_id=p_user for update;
 if s.id is null then raise exception 'Session unavailable' using errcode='42501';end if;
 if s.created_at<now()-interval '24 hours' then raise exception 'Session expired' using errcode='22023';end if;
 if s.version<>p_version or s.status not in ('active','processing') or (s.status='processing' and s.claimed_at>now()-interval '120 seconds') then raise exception 'Session changed or processing' using errcode='40001';end if;
 if length(trim(p_answer)) not between 1 and 6000 or jsonb_array_length(s.questions)<>jsonb_array_length(s.answers)+1 or jsonb_array_length(s.questions)>5 then raise exception 'Invalid answer' using errcode='22023';end if;
 if jsonb_array_length(s.questions)<5 then
  if (select count(*) from public.practice_ai_calls where user_id=p_user and created_at>now()-interval '24 hours')>=60 then raise exception 'Daily AI limit reached' using errcode='54000';end if;
  insert into public.practice_ai_calls(user_id) values(p_user);
 end if;
 update public.practice_interviews set status='processing',claim_id=p_claim,claimed_at=now(),pending_answer=p_answer,updated_at=now() where id=p_id returning * into s;
 return to_jsonb(s);
end;$$;
create or replace function public.finish_practice_turn(p_user uuid,p_id uuid,p_claim uuid,p_question text,p_ack text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.practice_interviews;last_turn boolean;
begin
 select * into s from public.practice_interviews where id=p_id and user_id=p_user for update;
 if s.id is null or s.status<>'processing' or s.claim_id is distinct from p_claim then raise exception 'Session claim expired' using errcode='40001';end if;
 last_turn:=jsonb_array_length(s.questions)=5;
 if not last_turn and (p_question is null or length(p_question) not between 10 and 1500) then raise exception 'Invalid question' using errcode='22023';end if;
 if length(coalesce(p_ack,''))>500 then raise exception 'Invalid acknowledgement' using errcode='22023';end if;
 update public.practice_interviews set answers=answers||jsonb_build_array(pending_answer),questions=case when last_turn then questions else questions||jsonb_build_array(p_question) end,acknowledgement=coalesce(p_ack,''),status=case when last_turn then 'completed' else 'active' end,version=version+1,pending_answer=null,claim_id=null,claimed_at=null,updated_at=now() where id=p_id returning * into s;
 return to_jsonb(s);
end;$$;
revoke all on function public.reserve_practice_interview(uuid,uuid,text,text),public.claim_practice_turn(uuid,uuid,integer,text,uuid),public.finish_practice_turn(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_practice_interview(uuid,uuid,text,text),public.claim_practice_turn(uuid,uuid,integer,text,uuid),public.finish_practice_turn(uuid,uuid,uuid,text,text) to service_role;
create or replace function public.reserve_practice_audio(p_user uuid,p_id uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=p_user for update;
 if not exists(select 1 from public.practice_interviews where id=p_id and user_id=p_user and version=p_version and status='active' and created_at>now()-interval '24 hours') then raise exception 'Session unavailable' using errcode='42501';end if;
 if (select count(*) from public.practice_ai_calls where user_id=p_user and created_at>now()-interval '24 hours')>=60 then raise exception 'Daily speech limit reached' using errcode='54000';end if;
 insert into public.practice_ai_calls(user_id,kind) values(p_user,'audio');
end;$$;
revoke all on function public.reserve_practice_audio(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.reserve_practice_audio(uuid,uuid,integer) to service_role;
commit;
