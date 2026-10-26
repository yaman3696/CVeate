export const SOCIAL_LABELS = { linkedin: 'LinkedIn', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', x: 'X' } as const
export const ASSET_LABELS = { logo: 'Light-mode logo', darkLogo: 'Dark-mode logo', footerLogo: 'Footer logo', favicon: 'Browser favicon', shareImage: 'Social sharing image' } as const
export type AssetKind = keyof typeof ASSET_LABELS
export type SiteSettings = {
  companyName: string; supportEmail: string; phone: string; address: string
  logo: string; darkLogo: string; footerLogo: string; favicon: string; shareImage: string
  seoTitle: string; seoDescription: string
  social: Record<keyof typeof SOCIAL_LABELS, string>
}
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  companyName: 'CVeat', supportEmail: 'support@cveat.in', phone: '+91 8826733504',
  address: 'CVeat Headquarters\nMayur Vihar Phase 1\nNew Delhi, Delhi, 110001, India',
  logo: '', darkLogo: '', footerLogo: '', favicon: '', shareImage: '',
  seoTitle: 'Cveat | AI Resume Builder & ATS Checker',
  seoDescription: 'Build professional resumes, check ATS compatibility, and prepare for job interviews with Cveat. Your AI-powered career companion.',
  social: { linkedin: '', instagram: '', facebook: '', youtube: '', x: '' },
}
export const ASSET_PATH = /^\/api\/site-assets\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const socialHosts = { linkedin: ['linkedin.com','www.linkedin.com'], instagram: ['instagram.com','www.instagram.com'], facebook: ['facebook.com','www.facebook.com'], youtube: ['youtube.com','www.youtube.com','youtu.be'], x: ['x.com','www.x.com','twitter.com','www.twitter.com'] }
export function validateSiteSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid settings.')
  const row = value as Record<string, unknown>
  if (Object.keys(row).sort().join() !== Object.keys(DEFAULT_SITE_SETTINGS).sort().join()) throw new Error('Unexpected or missing settings fields.')
  const text = (key: string, max: number, required = false) => {
    const v = row[key]
    if (typeof v !== 'string' || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v) || (key !== 'address' && /[\r\n]/.test(v)) || (required && !v.trim())) throw new Error(`Check ${key}.`)
    return v.trim()
  }
  const result: SiteSettings = { companyName: text('companyName',80,true), supportEmail:text('supportEmail',254,true), phone:text('phone',40), address:text('address',500), seoTitle:text('seoTitle',120,true), seoDescription:text('seoDescription',320,true), logo:'',darkLogo:'',footerLogo:'',favicon:'',shareImage:'',social:{...DEFAULT_SITE_SETTINGS.social} }
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(result.supportEmail)) throw new Error('Enter a valid support email.')
  if (result.phone && !/^[+\d ()-]{5,40}$/.test(result.phone)) throw new Error('Enter a valid contact number.')
  for (const key of Object.keys(ASSET_LABELS) as AssetKind[]) {
    const path=text(key,100); if (path && !ASSET_PATH.test(path)) throw new Error('Upload branding images using the upload buttons.')
    result[key]=path
  }
  if (!row.social || typeof row.social !== 'object' || Array.isArray(row.social) || Object.keys(row.social).sort().join() !== Object.keys(SOCIAL_LABELS).sort().join()) throw new Error('Invalid social links.')
  for (const key of Object.keys(SOCIAL_LABELS) as (keyof typeof SOCIAL_LABELS)[]) {
    const value=(row.social as Record<string,unknown>)[key]
    if (typeof value !== 'string' || value.length>500 || /[\s\x00-\x1f]/.test(value)) throw new Error(`Check the ${SOCIAL_LABELS[key]} link.`)
    if(value){let url:URL;try{url=new URL(value)}catch{throw new Error(`Use a full HTTPS ${SOCIAL_LABELS[key]} link.`)}
      if(url.protocol!=='https:'||url.username||url.password||url.port||!socialHosts[key].includes(url.hostname))throw new Error(`Use an official HTTPS ${SOCIAL_LABELS[key]} link.`)
    }
    result.social[key]=value
  }
  return result
}
