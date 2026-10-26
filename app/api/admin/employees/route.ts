import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { employeeEmail } from '@/lib/employee-domain'
import { employeeOwner, employeeHeaders as headers, employeeFailure, validEmployeePermissions, employeeControl, sendEmployeeInvitation, type Employee } from '@/lib/admin-employees'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fields = 'id,user_id,full_name,email,job_title,status,accepted_at,last_email_sent_at,version,created_at'
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')
  try {
    const access = await employeeOwner(token); if (access.error) return access.error
    const page = Number(request.nextUrl.searchParams.get('page') || '1'), search = (request.nextUrl.searchParams.get('search') || '').trim()
    if (!Number.isSafeInteger(page) || page<1 || page>100000 || search.length>254) return NextResponse.json({ error: 'Invalid filters.' }, { status: 400, headers })
    let query = supabaseAdmin.from('admin_employees').select(fields, { count: 'exact' })
    if (search) query = query.ilike(search.includes('@') ? 'email' : 'full_name', `%${search.replace(/[\\%_]/g,'\\$&')}%`)
    const { data, error, count } = await query.order('created_at',{ascending:false}).order('id').range((page-1)*25,page*25-1)
    if (error) throw error
    const ids=(data??[]).map(row=>row.user_id)
    const grants=ids.length ? await supabaseAdmin.from('admin_permission_sets').select('user_id,permissions').in('user_id',ids) : {data:[],error:null}
    if (grants.error) throw grants.error
    return NextResponse.json({ employees:(data??[]).map(row=>({...row,permissions:grants.data?.find(g=>g.user_id===row.user_id)?.permissions??[]})), total:count??0 },{headers})
  } catch(error) { return employeeFailure(error) }
}
export async function POST(request: NextRequest) {
  const token=request.headers.get('authorization')
  try {
    const access=await employeeOwner(token);if(access.error)return access.error
    const body=await request.json().catch(()=>null)
    const email=employeeEmail(body?.email), name=typeof body?.name==='string'?body.name.trim():'', title=typeof body?.jobTitle==='string'?body.jobTitle.trim():''
    if(!email||!name||name.length>100||title.length>100||/[\r\n\x00]/.test(name+title)||!validEmployeePermissions(body?.permissions))return NextResponse.json({error:'Enter employee details, an @cveat.in email, and valid permissions.'},{status:400,headers})
    const existing=await supabaseAdmin.from('admin_employees').select('id').eq('email',email).maybeSingle()
    if(existing.error)throw existing.error
    if(existing.data)return NextResponse.json({error:'This employee already exists. Use their existing record.'},{status:409,headers})
    const invite=await supabaseAdmin.auth.admin.generateLink({type:'invite',email,options:{data:{full_name:name}}})
    if(invite.error||!invite.data.user||!invite.data.properties.hashed_token)return NextResponse.json({error:'A new employee login could not be created. This address may already have a registered account.'},{status:409,headers})
    if(employeeEmail(invite.data.user.email)!==email||invite.data.user.email_confirmed_at||!invite.data.user.invited_at||Date.now()-Date.parse(invite.data.user.created_at)>300000)return NextResponse.json({error:'A fresh employee invitation is required.'},{status:409,headers})
    const {data,error}=await supabaseAdmin.rpc('admin_employee_control',{p_actor:access.admin!.id,p_action:'invite',p_user:invite.data.user.id,p_email:email,p_name:name,p_title:title,p_permissions:[...new Set(body.permissions)]})
    if(error)throw error
    const delivery=await sendEmployeeInvitation(access.admin!.id,data as Employee,invite.data.properties.hashed_token)
    return NextResponse.json({success:true,...delivery},{status:201,headers})
  }catch(error){return employeeFailure(error)}
}
export async function PATCH(request: NextRequest) {
  const token=request.headers.get('authorization')
  try {
    const access=await employeeOwner(token);if(access.error)return access.error
    const body=await request.json().catch(()=>null)
    if(!body||typeof body.id!=='string'||!uuid.test(body.id)||!Number.isSafeInteger(body.version)||body.version<1||!['permissions','suspend','restore','revoke','delete','resend'].includes(body.action))return NextResponse.json({error:'Invalid employee action.'},{status:400,headers})
    if(body.action==='permissions'&&!validEmployeePermissions(body.permissions))return NextResponse.json({error:'Invalid permissions.'},{status:400,headers})
    const {data,error}=await supabaseAdmin.from('admin_employees').select(fields).eq('id',body.id).maybeSingle()
    if(error)throw error
    if(!data)return NextResponse.json({error:'Employee not found.'},{status:404,headers})
    const employee=data as Employee
    if(employee.version!==body.version)return NextResponse.json({error:'Employee changed. Refresh before retrying.'},{status:409,headers})
    if(body.action==='resend')return NextResponse.json(await sendEmployeeInvitation(access.admin!.id,employee),{headers})
    if(body.action==='delete'){
      if(body.confirmEmail!==employee.email)return NextResponse.json({error:'Type the exact employee email to confirm permanent deletion.'},{status:400,headers})
      const claimed=await employeeControl(access.admin!.id,'delete',employee)
      const deleted=await supabaseAdmin.auth.admin.deleteUser(claimed.user_id)
      if(deleted.error&&deleted.error.status!==404)return NextResponse.json({error:'Admin access is blocked, but login deletion failed. Refresh and retry deletion.',employee:claimed},{status:502,headers})
      const final=await employeeControl(access.admin!.id,'deleted',claimed)
      return NextResponse.json({success:true,employee:final},{headers})
    }
    return NextResponse.json({success:true,employee:await employeeControl(access.admin!.id,body.action,employee,body.action==='permissions'?[...new Set(body.permissions as string[])]:undefined)},{headers})
  }catch(error){return employeeFailure(error)}
}
