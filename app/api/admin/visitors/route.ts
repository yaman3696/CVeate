import { NextRequest,NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'
import { checkAdminPermission } from '@/lib/admin-permissions'
export async function GET(request:NextRequest) {
 const headers={'Cache-Control':'no-store'}, token=request.headers.get('authorization')
 const admin=await requireAdmin(token)
 if(!admin)return NextResponse.json({error:'ACCESS_DENIED'},{status:403,headers})
 if(!await requireAdminMfa(token))return NextResponse.json({error:'MFA_REQUIRED'},{status:403,headers})
 const denied=await checkAdminPermission(admin.id,'overview.read');if(denied)return denied
 try {
  const result=await supabaseAdmin.rpc('active_site_visitors')
  if(result.error)return NextResponse.json({error:'VISITOR_SETUP_REQUIRED'},{status:503,headers})
  return NextResponse.json(result.data,{headers})
 }catch{return NextResponse.json({error:'Visitor count unavailable'},{status:503,headers})}
}
