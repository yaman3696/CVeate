'use client'
import { SOCIAL_LABELS } from '@/lib/site-settings'
import { useSiteSettings } from './SiteSettingsProvider'

type SocialPlatform = keyof typeof SOCIAL_LABELS
function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const paths: Record<SocialPlatform, React.ReactNode> = {
    linkedin: <><path d="M5.37 24H.4V7.98h4.97V24ZM2.88 5.79a2.88 2.88 0 1 1 0-5.76 2.88 2.88 0 0 1 0 5.76ZM24 24h-4.96v-7.8c0-1.86-.04-4.25-2.59-4.25-2.59 0-2.98 2.02-2.98 4.12V24H8.5V7.98h4.77v2.18h.07c.66-1.25 2.28-2.57 4.7-2.57 5.03 0 5.96 3.31 5.96 7.62V24Z" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.5" cy="6.5" r="1.1" /></>,
    facebook: <path d="M14 22v-9h3l.5-3H14V8c0-.87.3-1.5 1.6-1.5H18V3.2c-.7-.1-1.9-.2-3.1-.2C11.7 3 10 4.9 10 8.1V10H7v3h3v9h4Z" />,
    youtube: <path fillRule="evenodd" d="M21.6 6.4c-.2-.9-.9-1.6-1.8-1.8C18.2 4.2 12 4.2 12 4.2s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8 2 12 2 12s0 4 .4 5.6c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8C22 16 22 12 22 12s0-4-.4-5.6Z M10 8.5v7l6-3.5Z" />,
    x: <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.9-9L1.6 2h6.5l4.5 6.8L18.9 2ZM17.8 20h1.7L7.1 4H5.3l12.5 16Z" />,
  }
  return <svg viewBox="0 0 24 24" width="16" height="16" className="block h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true" focusable="false">{paths[platform]}</svg>
}

export function SiteSocialLinks() {
  const { social } = useSiteSettings()
  return <div className="-ml-2 flex flex-wrap items-center gap-1">
    {(Object.keys(SOCIAL_LABELS) as SocialPlatform[]).filter(key => social[key]).map(key => (
      <a key={key} href={social[key]} target="_blank" rel="noopener noreferrer"
        aria-label={`${SOCIAL_LABELS[key]} (opens in a new tab)`} title={SOCIAL_LABELS[key]}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
        <SocialIcon platform={key} />
      </a>
    ))}
  </div>
}
export function SiteCopyright() {
  const { companyName } = useSiteSettings()
  return <>© {new Date().getFullYear()} {companyName}. All rights reserved.</>
}
