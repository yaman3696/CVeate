'use client'
/* eslint-disable @next/next/no-img-element */
import { useSiteSettings } from './SiteSettingsProvider'
export default function SiteBrand({footer=false}:{footer?:boolean}){
  const settings=useSiteSettings()
  if(footer){const src=settings.footerLogo||settings.darkLogo||settings.logo;return src?<img src={src} alt={settings.companyName} className="h-9 w-auto max-w-40 object-contain"/>:<>{settings.companyName}</>}
  const light=settings.logo,dark=settings.darkLogo||light
  return <>{light?<img src={light} alt={settings.companyName} className="h-9 w-auto max-w-40 object-contain dark:hidden"/>:<span className="dark:hidden">{settings.companyName}</span>}{dark?<img src={dark} alt={settings.companyName} className="hidden h-9 w-auto max-w-40 object-contain dark:block"/>:<span className="hidden dark:inline">{settings.companyName}</span>}</>
}
