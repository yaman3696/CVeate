import { supabaseAdmin } from '@/lib/supabase-admin'
export async function GET(_request:Request, context:{params:Promise<{id:string}>}) {
  const {id}=await context.params
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))return new Response(null,{status:404})
  const {data,error}=await supabaseAdmin.from('site_brand_assets').select('content,mime').eq('id',id).maybeSingle()
  if(error)return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}})
  if(!data)return new Response(null,{status:404})
  return new Response(Buffer.from(data.content,'base64'),{headers:{'Content-Type':data.mime,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}})
}
