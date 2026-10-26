import { getPublishedSiteSettings } from '@/lib/site-settings-server'
export async function GET() {
  return Response.json(await getPublishedSiteSettings(), {headers:{'Cache-Control':'no-store'}})
}
