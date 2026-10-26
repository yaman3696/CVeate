import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { employeeOwner, employeeHeaders as headers } from '@/lib/admin-employees'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ASSET_LABELS, type AssetKind } from '@/lib/site-settings'
export async function POST(request:NextRequest){
  try{
    const access=await employeeOwner(request.headers.get('authorization'));if(access.error)return access.error
    if(Number(request.headers.get('content-length')||0)>3*1024*1024)return NextResponse.json({error:'Choose an image smaller than 2 MB.'},{status:413,headers})
    const form=await request.formData(), file=form.get('file'),kind=form.get('kind')
    if(typeof kind!=='string'||!Object.hasOwn(ASSET_LABELS,kind)||!(file instanceof File)||file.size>2*1024*1024||!file.size||!['image/png','image/jpeg','image/webp'].includes(file.type))return NextResponse.json({error:'Choose a PNG, JPG or WebP image, up to 2 MB. Export ICO/SVG logos to PNG first.'},{status:400,headers})
    const input=Buffer.from(await file.arrayBuffer())
    let content:Buffer,width:number,height:number
    try{
      const image=sharp(input,{limitInputPixels:16000000,animated:false}),meta=await image.metadata()
      if(!['png','jpeg','webp'].includes(meta.format||'')||(meta.pages||1)>1)throw new Error('Invalid image')
      if(kind==='favicon'&&meta.width!==meta.height)return NextResponse.json({error:'Use a square favicon image.'},{status:400,headers})
      const max=kind==='favicon'?256:kind==='shareImage'?1600:1200
      const result=await image.rotate().resize({width:max,height:kind==='favicon'?max:kind==='shareImage'?900:400,fit:'inside',withoutEnlargement:true}).png().toBuffer({resolveWithObject:true})
      content=result.data;width=result.info.width;height=result.info.height
      if(content.length>1024*1024)throw new Error('Image too large')
    }catch{return NextResponse.json({error:'This image could not be processed. Try a smaller PNG, JPG or WebP.'},{status:400,headers})}
    const {data,error}=await supabaseAdmin.from('site_brand_assets').insert({kind:kind as AssetKind,content:content.toString('base64'),mime:'image/png',width,height,created_by:access.admin!.id}).select('id').single()
    if(error)return NextResponse.json({error:'Image upload failed. Check Settings database setup.'},{status:503,headers})
    return NextResponse.json({url:`/api/site-assets/${data.id}`,width,height},{status:201,headers})
  }catch{return NextResponse.json({error:'Unable to upload image.'},{status:503,headers})}
}
