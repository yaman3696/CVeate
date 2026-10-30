-- No existing history is pruned by this migration. Replacement requires explicit confirmation.
begin;
create or replace function public.guard_personal_history_capacity()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_kind text; v_count integer;
begin
  if new.user_id is null then raise exception 'A history owner is required' using errcode='23502'; end if;
  if tg_op='UPDATE' and new.user_id is not distinct from old.user_id then return new; end if;
  v_kind := case when tg_table_name='cv_history' then 'cv' else 'interview' end;
  perform pg_advisory_xact_lock(hashtextextended('cveat-history:'||new.user_id::text||':'||v_kind,0));
  if v_kind='cv' then select count(*) into v_count from public.cv_history where user_id=new.user_id;
  else select count(*) into v_count from public.interview_history where user_id=new.user_id; end if;
  if v_count>=10 then raise exception 'History limit reached. Use the confirmed history save function.' using errcode='23514'; end if;
  return new;
end $$;
revoke all on function public.guard_personal_history_capacity() from public;
drop trigger if exists cv_history_capacity_guard on public.cv_history;
create trigger cv_history_capacity_guard before insert or update of user_id on public.cv_history for each row execute function public.guard_personal_history_capacity();
drop trigger if exists interview_history_capacity_guard on public.interview_history;
create trigger interview_history_capacity_guard before insert or update of user_id on public.interview_history for each row execute function public.guard_personal_history_capacity();

create or replace function public.save_personal_history(p_kind text,p_payload jsonb,p_replace_oldest_id uuid default null,p_expected_count integer default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
 v_user uuid := auth.uid(); v_count integer; v_oldest uuid; v_title text; v_date timestamptz; v_primary boolean:=false;
 v_remove integer:=0; v_id uuid; v_new_primary boolean:=false;
begin
 if v_user is null then raise exception 'Sign in before saving history' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('cv','interview') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid history save'; end if;
 if p_kind='cv' and (jsonb_typeof(p_payload->'cv_data') is distinct from 'object' or length(coalesce(p_payload->>'cv_title',''))>200) then raise exception 'Invalid CV data'; end if;
 if p_kind='interview' and (jsonb_typeof(p_payload->'qa_transcript') is distinct from 'array' or jsonb_typeof(p_payload->'report_data') is distinct from 'object') then raise exception 'Invalid interview data'; end if;
 perform pg_advisory_xact_lock(hashtextextended('cveat-history:'||v_user::text||':'||p_kind,0));
 if p_kind='cv' then
  select count(*) into v_count from public.cv_history where user_id=v_user;
  select id,coalesce(nullif(cv_title,''),'Untitled CV'),created_at,is_primary into v_oldest,v_title,v_date,v_primary from public.cv_history where user_id=v_user order by created_at asc nulls first,id asc limit 1;
 else
  select count(*) into v_count from public.interview_history where user_id=v_user;
  select id,coalesce(nullif(profession,''),'Interview evaluation'),created_at into v_oldest,v_title,v_date from public.interview_history where user_id=v_user order by created_at asc nulls first,id asc limit 1;
 end if;
 if v_count>=10 then
  v_remove:=v_count-9;
  if p_replace_oldest_id is distinct from v_oldest or p_expected_count is distinct from v_count then
   return jsonb_build_object('requires_confirmation',true,'count',v_count,'remove_count',v_remove,'oldest',jsonb_build_object('id',v_oldest,'title',v_title,'created_at',v_date,'is_primary',v_primary));
  end if;
  if p_kind='cv' then
   delete from public.cv_history where user_id=v_user and id in(select id from public.cv_history where user_id=v_user order by created_at asc nulls first,id asc limit v_remove);
  else
   delete from public.interview_history where user_id=v_user and id in(select id from public.interview_history where user_id=v_user order by created_at asc nulls first,id asc limit v_remove);
  end if;
 end if;
 if p_kind='cv' then
  select not exists(select 1 from public.cv_history where user_id=v_user and is_primary=true) into v_new_primary;
  insert into public.cv_history(user_id,cv_title,cv_data,match_score,is_primary)
   values(v_user,coalesce(nullif(btrim(p_payload->>'cv_title'),''),'Professional Resume'),p_payload->'cv_data',null,v_new_primary) returning id into v_id;
 else
  insert into public.interview_history(user_id,profession,seniority,experience,score,feedback_summary,qa_transcript,report_data)
   values(v_user,left(p_payload->>'profession',200),left(p_payload->>'seniority',100),left(p_payload->>'experience',200),(p_payload->>'score')::numeric,p_payload->>'feedback_summary',p_payload->'qa_transcript',p_payload->'report_data') returning id into v_id;
 end if;
 return jsonb_build_object('saved',true,'id',v_id,'count',least(v_count+1,10),'removed',v_remove);
end $$;
revoke all on function public.save_personal_history(text,jsonb,uuid,integer) from public;
grant execute on function public.save_personal_history(text,jsonb,uuid,integer) to authenticated;
create index if not exists cv_history_owner_saved_order on public.cv_history(user_id,created_at,id);
create index if not exists interview_history_owner_saved_order on public.interview_history(user_id,created_at,id);
notify pgrst,'reload schema';
commit;
