import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type Job,JOB_FIELDS,INDIAN_STATES,SENIORITIES,WORK_MODES,EMPLOYMENT_TYPES } from '@/lib/enterprise'
export async function GET(req:NextRequest){const p=req.nextUrl.searchParams;const headers={'Cache-Control':'no-store'};try{
 const id=p.get('id')||'';if(id&&!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Invalid job.'},{status:400,headers})
 const page=Number(p.get('page')||1),q=(p.get('q')||'').trim(),state=p.get('state')||'',seniority=p.get('seniority')||'',mode=p.get('mode')||'',type=p.get('type')||'',city=(p.get('city')||'').trim(),skill=(p.get('skill')||'').trim(),experience=p.get('experience'),salary=p.get('salary')
 const valid=(v:string,list:readonly string[])=>!v||list.includes(v)
 if(!Number.isSafeInteger(page)||page<1||page>10000||q.length>100||city.length>100||skill.length>60||!valid(state,INDIAN_STATES)||!valid(seniority,SENIORITIES)||!valid(mode,WORK_MODES)||!valid(type,EMPLOYMENT_TYPES)||(experience!==null&&(!/^\d+$/.test(experience)||Number(experience)>50))||(salary!==null&&(!/^\d+$/.test(salary)||Number(salary)>1000000000)))return Response.json({error:'Check your job filters.'},{status:400,headers})
 let query=supabaseAdmin.from('enterprise_jobs').select(`${JOB_FIELDS},organizations!inner(name,website,status)`,{count:'exact'}).eq('status','published').eq('organizations.status','verified').or(`deadline.is.null,deadline.gte.${new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})}`)
 if(id)query=query.eq('id',id)
 const escape=(s:string)=>s.replace(/[\\%_]/g,'\\$&')
 if(q)query=query.ilike('title',`%${escape(q)}%`);if(state)query=query.eq('state',state);if(city)query=query.ilike('city',`%${escape(city)}%`);if(seniority)query=query.eq('seniority',seniority);if(mode)query=query.eq('work_mode',mode);if(type)query=query.eq('employment_type',type);if(skill)query=query.contains('skills',[skill]);if(experience!==null)query=query.lte('experience_min',Number(experience));if(salary!==null)query=query.gte('salary_max',Number(salary))
 const {data,error,count}=await query.order('created_at',{ascending:false}).order('id').range((page-1)*12,page*12-1).returns<Job[]>()
 if(error)return Response.json({error:'Job listings are temporarily unavailable. Please try again shortly.'},{status:503,headers})
 // Never project verification details or recruiter contact information into the public response.
 return Response.json({jobs:(data||[]).map(row=>({...row,organizations:{name:row.organizations!.name,website:row.organizations!.website}})),total:count||0,page},{headers})
 }catch{return Response.json({error:'Unable to load jobs.'},{status:503,headers})}}
