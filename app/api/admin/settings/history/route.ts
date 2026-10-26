import { NextRequest, NextResponse } from 'next/server'
import { employeeOwner, employeeHeaders as headers } from '@/lib/admin-employees'
import { supabaseAdmin } from '@/lib/supabase-admin'
export async function GET(request:NextRequest){
 try{
  const access=await employeeOwner(request.headers.get('authorization'));if(access.error)return access.error
  const id=request.nextUrl.searchParams.get('id')||''
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))return NextResponse.json({error:'Invalid saved version.'},{status:400,headers})
  const {data,error}=await supabaseAdmin.from('site_settings_history').select('data,version').eq('id',id).single()
  if(error)return NextResponse.json({error:'Saved version unavailable.'},{status:404,headers})
  return NextResponse.json(data,{headers})
 }catch{return NextResponse.json({error:'Unable to load saved version.'},{status:503,headers})}
}
