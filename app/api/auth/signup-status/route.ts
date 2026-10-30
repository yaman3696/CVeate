import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enterpriseUser } from '@/lib/enterprise-server'
import { signupHashes } from '@/lib/signup-server'
const headers={'Cache-Control':'no-store'}
export async function GET(request:NextRequest){
 const user=await enterpriseUser(request.headers.get('authorization'))
 if(!user)return NextResponse.json({error:'Please sign in.'},{status:401,headers})
 const {data,error}=await supabaseAdmin.rpc('signup_access_status',{p_user:user.id})
 return NextResponse.json(error?{error:'Account checks are temporarily unavailable.'}:data,{status:error?503:200,headers})
}
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin || !request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Invalid request.'},{status:403,headers})
 const user=await enterpriseUser(request.headers.get('authorization'))
 if(!user)return NextResponse.json({error:'Please sign in.'},{status:401,headers})
 try {
 const raw=await request.text();if(raw.length>512)throw Error();const body=JSON.parse(raw)
 if(typeof body.mobile!=='string'||typeof body.browserId!=='string'||! /^[0-9a-f-]{36}$/i.test(body.browserId))throw Error()
 const {data,error}=await supabaseAdmin.rpc('complete_signup_phone',{p_user:user.id,p_phone:body.mobile,...signupHashes(request,body.browserId)})
 if(error)return NextResponse.json({error:'Your number could not be saved. Please try again.'},{status:503,headers})
 return NextResponse.json(data,{status:data?.error?data.status||400:200,headers})
 }catch{return NextResponse.json({error:'Check your mobile number and try again.'},{status:400,headers})}
}
