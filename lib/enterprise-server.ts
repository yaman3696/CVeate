import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
export const privateHeaders={'Cache-Control':'private, no-store'}
export async function enterpriseUser(header:string|null){if(!header?.startsWith('Bearer '))return null;const {data,error}=await supabaseAdmin.auth.getUser(header.slice(7));return error?null:data.user}
export async function employerMembership(userId:string,orgId:string){return supabaseAdmin.from('organization_members').select('role,organizations(id,name,website,status,created_at)').eq('organization_id',orgId).eq('user_id',userId).maybeSingle()}
export function enterpriseError(error:unknown){if(error instanceof Error&&'digest'in error&&error.digest==='NEXT_PRERENDER_INTERRUPTED')throw error;return Response.json({error:'Enterprise setup is required or the service is unavailable. Please retry.'},{status:503,headers:privateHeaders})}
