import 'server-only'
import { createHmac } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
export function signupHashes(request: Request, browserId: string) {
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!secret) throw Error('Signup unavailable')
 // Vercel overwrites this header. Ignore client-supplied forwarding headers off Vercel.
 const network=process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : 'local-development'
 if(!network) throw Error('Signup network unavailable')
 const hash=(value:string)=>createHmac('sha256',secret).update(value).digest('hex')
 return {p_network:hash('signup-network:'+network),p_browser:hash('signup-browser:'+browserId)}
}
export async function signupAccess(userId:string) {
 const {data,error}=await supabaseAdmin.rpc('signup_access_status',{p_user:userId})
 if(error) return Response.json({error:'Account checks are temporarily unavailable. Please try again.'},{status:503})
 if(!data?.ready) return Response.json({error:data?.needsMobile?'Add your 10-digit mobile number to complete signup before using AI features.':'Verify your email before using AI features.',code:'SIGNUP_INCOMPLETE'},{status:403})
 return null
}
