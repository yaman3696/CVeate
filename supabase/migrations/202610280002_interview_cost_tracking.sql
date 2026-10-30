-- Metadata-only costing. No CVs, questions, answers, transcripts or audio.
begin;
create table if not exists public.interview_cost_settings (
 singleton boolean primary key default true check(singleton), usd_to_inr numeric not null check(usd_to_inr>0), updated_at timestamptz not null default now()
);
insert into public.interview_cost_settings(singleton,usd_to_inr) values(true,90) on conflict do nothing;
create table if not exists public.interview_provider_rates (
 provider text not null, model text not null, rates jsonb not null check(jsonb_typeof(rates)='object'),
 source_url text not null, verified_at timestamptz not null default now(), primary key(provider,model)
);
insert into public.interview_provider_rates(provider,model,rates,source_url,verified_at) values
 ('gemini','gemini-3.1-flash-lite','{"input_usd_per_million":0.25,"audio_input_usd_per_million":0.50,"output_usd_per_million":1.50,"cached_input_usd_per_million":0.025,"cached_audio_usd_per_million":0.05}','https://ai.google.dev/gemini-api/docs/pricing','2026-10-28T00:00:00Z'),
 ('sarvam','bulbul:v3','{"inr_per_10000_characters":30}','https://docs.sarvam.ai/api/getting-started/pricing','2026-10-28T00:00:00Z')
on conflict do nothing;
create table if not exists public.interview_cost_sessions (
 id uuid primary key,user_id uuid references auth.users(id) on delete set null,
 mode text not null check(mode in ('text','conversation','unknown')),created_at timestamptz not null default now(),
 prepared_at timestamptz,reviewed_at timestamptz,credits_charged smallint not null default 0 check(credits_charged between 0 and 1)
);
create table if not exists public.interview_cost_events (
 id uuid primary key,session_id uuid not null references public.interview_cost_sessions(id),
 provider text not null check(provider in ('gemini','sarvam')),model text not null,resolved_model text,
 stage text not null check(stage in ('preparation','speech','transcription','feedback')),
 status text not null default 'started' check(status in ('started','generated','invalid_response','failed')),
 input_tokens bigint, audio_input_tokens bigint, output_tokens bigint, thinking_tokens bigint,cached_tokens bigint,cached_audio_tokens bigint,characters bigint,
 estimated_cost_inr numeric check(estimated_cost_inr>=0),rate_snapshot jsonb,
 provider_request_id text,created_at timestamptz not null default now(),finished_at timestamptz
);
create index if not exists interview_cost_sessions_created on public.interview_cost_sessions(created_at desc,id);
create index if not exists interview_cost_events_session on public.interview_cost_events(session_id,created_at);
alter table public.interview_cost_settings enable row level security;
alter table public.interview_provider_rates enable row level security;
alter table public.interview_cost_sessions enable row level security;
alter table public.interview_cost_events enable row level security;
revoke all on public.interview_cost_settings,public.interview_provider_rates,public.interview_cost_sessions,public.interview_cost_events from public,anon,authenticated,service_role;
grant select on public.interview_cost_settings,public.interview_provider_rates to service_role;
grant select,insert,update on public.interview_cost_sessions,public.interview_cost_events to service_role;
create or replace function public.interview_cost_lifetime()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('knownCostInr',coalesce(sum(estimated_cost_inr),0),'unknownAttempts',count(*) filter(where estimated_cost_inr is null),'attempts',count(*),'inputTokens',coalesce(sum(input_tokens),0),'outputTokens',coalesce(sum(output_tokens),0)+coalesce(sum(thinking_tokens),0)) from public.interview_cost_events;
$$;
revoke all on function public.interview_cost_lifetime() from public,anon,authenticated;
grant execute on function public.interview_cost_lifetime() to service_role;
create or replace function public.interview_cost_report(p_since timestamptz,p_until timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_since is null or p_until is null or p_until<=p_since or p_until-p_since>interval '366 days' then raise exception 'Invalid reporting period' using errcode='22023';end if;
 with cohort as (select id,mode,created_at,case when prepared_at<p_until then prepared_at end prepared_at,case when reviewed_at<p_until then reviewed_at end reviewed_at,case when reviewed_at<p_until then credits_charged else 0 end credits_charged from public.interview_cost_sessions where created_at>=p_since and created_at<p_until),
 events as (select e.* from public.interview_cost_events e join cohort s on s.id=e.session_id where e.created_at<p_until),
 per_session as (
 select s.id,s.mode,s.created_at,s.prepared_at,s.reviewed_at,s.credits_charged,count(e.id)::int attempts,
 count(e.id) filter(where e.estimated_cost_inr is null)::int unknown_attempts,
 case when s.reviewed_at is not null then count(e.id) filter(where e.stage='preparation')>0 and count(e.id) filter(where e.stage='feedback')>0 else count(e.id)>0 end coverage_complete,
 coalesce(sum(e.estimated_cost_inr),0) known_cost,
 coalesce(sum(e.estimated_cost_inr) filter(where e.stage='preparation'),0) preparation_cost,
 coalesce(sum(e.estimated_cost_inr) filter(where e.stage='speech'),0) speech_cost,
 coalesce(sum(e.estimated_cost_inr) filter(where e.stage='transcription'),0) transcription_cost,
 coalesce(sum(e.estimated_cost_inr) filter(where e.stage='feedback'),0) feedback_cost
 from cohort s left join events e on e.session_id=s.id group by s.id,s.mode,s.created_at,s.prepared_at,s.reviewed_at,s.credits_charged
 ), stages as (select stage,provider,count(*)::int attempts,count(*) filter(where estimated_cost_inr is null)::int unknown_attempts,
 coalesce(sum(estimated_cost_inr),0) known_cost,coalesce(sum(input_tokens),0) input_tokens,coalesce(sum(output_tokens),0) output_tokens,coalesce(sum(thinking_tokens),0) thinking_tokens,coalesce(sum(characters),0) characters
 from events group by stage,provider), modes as (
 select mode,count(*)::int started,count(*) filter(where reviewed_at is not null)::int reviewed,
 coalesce(sum(known_cost),0) known_cost,coalesce(sum(unknown_attempts),0) unknown_attempts,
 avg(known_cost) filter(where reviewed_at is not null and unknown_attempts=0 and attempts>0 and coverage_complete) average_complete_cost,
 case when count(*) filter(where reviewed_at is not null)>0 then sum(known_cost)/count(*) filter(where reviewed_at is not null) end effective_cost_per_review
 from per_session group by mode
 )
 select jsonb_build_object(
 'since',p_since,'until',p_until,
 'lifetime',public.interview_cost_lifetime(),
 'lifetimeStages',coalesce((select jsonb_agg(to_jsonb(l)) from(select stage,count(*)::int requests,coalesce(sum(input_tokens),0) input_tokens,coalesce(sum(output_tokens),0)+coalesce(sum(thinking_tokens),0) output_tokens,coalesce(sum(estimated_cost_inr),0) known_cost from public.interview_cost_events group by stage) l),'[]'::jsonb),
 'summary',(select jsonb_build_object('started',count(*),'prepared',count(*) filter(where prepared_at is not null),'reviewed',count(*) filter(where reviewed_at is not null),
 'expiredUnreviewed',count(*) filter(where reviewed_at is null and created_at<p_until-interval '24 hours'),
 'knownCostInr',coalesce(sum(known_cost),0),'unknownAttempts',coalesce(sum(unknown_attempts),0),'attempts',coalesce(sum(attempts),0),
 'incompleteSessions',count(*) filter(where not coverage_complete),'sessionsWithoutAttempts',count(*) filter(where attempts=0),'careerCreditsCharged',coalesce(sum(credits_charged),0)) from per_session),
 'stages',coalesce((select jsonb_agg(to_jsonb(t)) from stages t),'[]'::jsonb),
 'modes',coalesce((select jsonb_agg(to_jsonb(m)) from modes m),'[]'::jsonb),
 'sessions',coalesce((select jsonb_agg(to_jsonb(r)) from(select * from per_session order by created_at desc,id limit 50) r),'[]'::jsonb),
 'rates',coalesce((select jsonb_agg(to_jsonb(r)) from public.interview_provider_rates r),'[]'::jsonb),
 'usdToInr',(select usd_to_inr from public.interview_cost_settings where singleton)
 ) into result;
 return result;
end;$$;
revoke all on function public.interview_cost_report(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.interview_cost_report(timestamptz,timestamptz) to service_role;
commit;
