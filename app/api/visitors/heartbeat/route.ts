import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
export async function POST(request:NextRequest) {
 const headers={'Cache-Control':'no-store'}
 if(request.headers.get('origin')!==request.nextUrl.origin || !request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Invalid request'},{status:403,headers})
 // Development and Vercel previews must not inflate the production visitor count.
 if(process.env.NODE_ENV==='development' || (process.env.VERCEL_ENV && process.env.VERCEL_ENV!=='production'))return new Response(null,{status:204,headers})
 try {
  if(Number(request.headers.get('content-length')||0)>512)return new Response(null,{status:413,headers})
  const raw=await request.text();if(raw.length>512)return new Response(null,{status:413,headers})
  const body=JSON.parse(raw)
  if(typeof body.visitorId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.visitorId))return new Response(null,{status:400,headers})
  let kind='guest'
  const token=request.headers.get('authorization')
  if(token?.startsWith('Bearer ')){const {data,error}=await supabaseAdmin.auth.getUser(token.slice(7));if(!error&&data.user)kind='user'}
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!secret)throw Error('Configuration missing')
  const hash=createHmac('sha256',secret).update('cveat-live-visitor:'+body.visitorId).digest('hex')
  const result=await supabaseAdmin.rpc('touch_site_visitor',{p_hash:hash,p_kind:kind})
  if(result.error)return NextResponse.json({error:'Presence setup unavailable'},{status:503,headers})
  return new Response(null,{status:204,headers})
 }catch{return new Response(null,{status:400,headers})}
}
