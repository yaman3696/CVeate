import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { signupHashes } from '@/lib/signup-server'
const headers={'Cache-Control':'no-store'}
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin || !request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({error:'Invalid signup request.'},{status:403,headers})
 try {
 const raw=await request.text();if(raw.length>1024)return NextResponse.json({error:'Invalid signup request.'},{status:413,headers})
 const body=JSON.parse(raw)
 if(typeof body.email!=='string'||typeof body.mobile!=='string'||typeof body.browserId!=='string'||! /^[0-9a-f-]{36}$/i.test(body.browserId))return NextResponse.json({error:'Check your signup details.'},{status:400,headers})
 const {data,error}=await supabaseAdmin.rpc('prepare_signup',{p_email:body.email.trim().toLowerCase(),p_phone:body.mobile,...signupHashes(request,body.browserId)})
 if(error)return NextResponse.json({error:'Signup checks are temporarily unavailable. Please try again.'},{status:503,headers})
 return NextResponse.json(data,{status:data?.error?data.status||400:200,headers})
 }catch{return NextResponse.json({error:'Signup could not be checked. Please try again.'},{status:400,headers})}
}
