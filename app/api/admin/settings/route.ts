import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { employeeOwner, employeeHeaders as headers } from '@/lib/admin-employees'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateSiteSettings, ASSET_LABELS, type AssetKind } from '@/lib/site-settings'
export async function GET(request:NextRequest){
  try{
    const access=await employeeOwner(request.headers.get('authorization'));if(access.error)return access.error
    const [current,history]=await Promise.all([supabaseAdmin.from('site_settings').select('data,version,updated_at').eq('id',1).single(),supabaseAdmin.from('site_settings_history').select('id,version,created_at,actor_id,restored_from').order('version',{ascending:false}).limit(25)])
    if(current.error||history.error)return NextResponse.json({error:'Settings database setup is required or unavailable.'},{status:503,headers})
    return NextResponse.json({current:current.data,history:history.data},{headers})
  }catch{return NextResponse.json({error:'Unable to load settings.'},{status:503,headers})}
}
export async function POST(request:NextRequest){
  try{
    const access=await employeeOwner(request.headers.get('authorization'));if(access.error)return access.error
    if(Number(request.headers.get('content-length')||0)>20000)return NextResponse.json({error:'Settings are too large.'},{status:413,headers})
    const raw=await request.text();if(raw.length>20000)return NextResponse.json({error:'Settings are too large.'},{status:413,headers})
    let body;try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid settings request.'},{status:400,headers})}
    if(!Number.isSafeInteger(body?.version)||body.version<1)return NextResponse.json({error:'Refresh settings before publishing.'},{status:400,headers})
    let settings,restored:string|null=null
    if(body.restoreId){
      if(typeof body.restoreId!=='string'||!/^[0-9a-f-]{36}$/.test(body.restoreId))return NextResponse.json({error:'Invalid saved version.'},{status:400,headers})
      const old=await supabaseAdmin.from('site_settings_history').select('data').eq('id',body.restoreId).single()
      if(old.error)return NextResponse.json({error:'Saved version unavailable.'},{status:404,headers})
      restored=body.restoreId;settings=validateSiteSettings(old.data.data)
    }else{try{settings=validateSiteSettings(body.data)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid settings.'},{status:400,headers})}}
    for(const kind of Object.keys(ASSET_LABELS) as AssetKind[]){
      if(!settings[kind])continue
      const asset=await supabaseAdmin.from('site_brand_assets').select('id').eq('id',settings[kind].split('/').pop()!).eq('kind',kind).maybeSingle()
      if(asset.error||!asset.data)return NextResponse.json({error:`Upload a valid ${ASSET_LABELS[kind]}.`},{status:400,headers})
    }
    const {data,error}=await supabaseAdmin.rpc('publish_site_settings',{p_actor:access.admin!.id,p_version:body.version,p_data:settings,p_restored_from:restored})
    if(error)return NextResponse.json({error:error.code==='40001'?'Settings changed in another session. Refresh and review before publishing.':'Settings could not be published. Check database setup.'},{status:error.code==='40001'?409:503,headers})
    try{revalidateTag('site-settings',{expire:0})}catch{/* Database publish is committed; TTL still refreshes the public cache. */}
    return NextResponse.json({current:data},{headers})
  }catch{return NextResponse.json({error:'Unable to publish settings.'},{status:503,headers})}
}
