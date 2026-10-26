import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminPermissions } from '@/lib/admin-permissions'
import { adminLandingPath } from '@/lib/admin-permission-catalog'
import { employeeEmail } from '@/lib/employee-domain'
export async function POST(request: NextRequest) {
  const headers={'Cache-Control':'private, no-store'}
  const authorization=request.headers.get('authorization')
  if(!authorization?.startsWith('Bearer '))return NextResponse.json({error:'Sign in using your employee invitation.'},{status:401,headers})
  const {data,error}=await supabaseAdmin.auth.getUser(authorization.slice(7).trim())
  const email=employeeEmail(data.user?.email)
  if(error||!data.user||!email||!data.user.email_confirmed_at)return NextResponse.json({error:'A verified @cveat.in invitation is required.'},{status:403,headers})
  const accepted=await supabaseAdmin.rpc('accept_admin_employee',{p_user:data.user.id,p_email:email})
  if(accepted.error)return NextResponse.json({error:'This invitation is no longer active. Contact the owner.'},{status:403,headers})
  const access=await getAdminPermissions(data.user.id)
  return NextResponse.json({success:true,next:adminLandingPath(access.permissions)},{headers})
}
