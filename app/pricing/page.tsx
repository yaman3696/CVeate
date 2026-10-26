'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
type RazorpayResponse = {
razorpay_order_id: string
razorpay_payment_id: string
razorpay_signature: string
}
type RazorpayCheckout = {
open: () => void
on: (event: string, callback: (response: unknown) => void) => void
}
type RazorpayConstructor = new (options: {
key: string
amount: number
currency: string
name: string
description: string
order_id: string
handler: (response: RazorpayResponse) => void | Promise<void>
prefill?: { email?: string }
theme?: { color: string }
modal?: { ondismiss: () => void }
}) => RazorpayCheckout
function loadRazorpay(): Promise<RazorpayConstructor> {
return new Promise((resolve, reject) => {
const existing = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay
if (existing) return resolve(existing)
const script = document.createElement('script')
script.src = 'https://checkout.razorpay.com/v1/checkout.js'
script.async = true
script.onload = () => {
const Razorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay
if (Razorpay) resolve(Razorpay)
else reject(new Error('Razorpay Checkout could not be loaded.'))
}
script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'))
document.body.appendChild(script)
})
}
type BillingDetails = {
billing_name: string
billing_email: string
address_line1: string
address_line2: string
city: string
state: string
postal_code: string
country: 'IN'
}
const emptyBilling: BillingDetails = { billing_name: '', billing_email: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: 'IN' }
type Pack = {
packageKey?: string
name: string
eyebrow: string
price: string
description: string
features: string[]
popular?: boolean
free?: boolean
}
const packs: Pack[] = [
{
name: 'Free', eyebrow: 'GET STARTED', price: '₹0', free: true,
description: 'Build your resume and explore Cveat at no cost.',
features: ['Free CV builder and PDF export', '3 one-time welcome Career Credits for new accounts', 'No automatic daily or monthly credit refills'],
},
{
packageKey: 'starter', name: 'Starter', eyebrow: 'TRY MORE', price: '₹19',
description: 'A little extra support for your next application.',
features: ['3 Career Credits', 'Use credits for eligible AI ATS and interview tools', 'One-time pack, not a subscription'],
},
{
packageKey: 'growth', name: 'Growth', eyebrow: 'MOST POPULAR', price: '₹49', popular: true,
description: 'For job seekers actively refining their applications.',
features: ['10 Career Credits', 'Use across eligible AI tools', 'One-time pack, not a subscription'],
},
{
packageKey: 'career_pro', name: 'Career Pro', eyebrow: 'BEST VALUE', price: '₹99',
description: 'More flexibility for repeated applications and practice.',
features: ['25 Career Credits', 'Use across eligible AI tools', 'One-time pack, not a subscription'],
},
]
export default function PricingPage() {
const canvasRef = useRef<HTMLCanvasElement | null>(null)
const [paymentBusy, setPaymentBusy] = useState<string | null>(null)
const [billingPack, setBillingPack] = useState<Pack | null>(null)
const [billing, setBilling] = useState<BillingDetails>(emptyBilling)
const [billingLoading, setBillingLoading] = useState(false)
const [billingError, setBillingError] = useState<string | null>(null)
const [billingFieldErrors, setBillingFieldErrors] = useState<Partial<Record<keyof BillingDetails, string>>>({})
const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
const [paymentSucceeded, setPaymentSucceeded] = useState(false)
const [enterpriseOpen, setEnterpriseOpen] = useState(false)
const [company, setCompany] = useState('')
const [contact, setContact] = useState('')
const [email, setEmail] = useState('')
const [requirement, setRequirement] = useState('')
const [message, setMessage] = useState('')
useEffect(() => {
const canvas = canvasRef.current
if (!canvas) return
const ctx = canvas.getContext('2d')
if (!ctx) return
let frame = 0
let width = 0
let height = 0
const resize = () => {
const rect = canvas.getBoundingClientRect()
width = Math.max(1, rect.width)
height = Math.max(1, rect.height)
const dpr = Math.min(window.devicePixelRatio || 1, 2)
canvas.width = Math.round(width * dpr)
canvas.height = Math.round(height * dpr)
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
resize()
window.addEventListener('resize', resize)
const particles = Array.from({ length: 25 }, () => ({
x: Math.random() * width, y: Math.random() * height,
vx: (Math.random() - 0.5) * 0.5,
vy: (Math.random() - 0.5) * 0.5,
radius: Math.random() * 2 + 1.5,
}))
const render = () => {
ctx.clearRect(0, 0, width, height)
for (let i = 0; i < particles.length; i++) {
for (let j = i + 1; j < particles.length; j++) {
const dx = particles[i].x - particles[j].x
const dy = particles[i].y - particles[j].y
const dist = Math.hypot(dx, dy)
if (dist < 120) {
ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 120)})`
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(particles[i].x, particles[i].y)
ctx.lineTo(particles[j].x, particles[j].y)
ctx.stroke()
}
}
const p = particles[i]
p.x += p.vx
p.y += p.vy
if (p.x < 0 || p.x > width) p.vx *= -1
if (p.y < 0 || p.y > height) p.vy *= -1
ctx.fillStyle = 'rgba(99,102,241,0.3)'
ctx.beginPath()
ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
ctx.fill()
}
frame = window.requestAnimationFrame(render)
}
frame = window.requestAnimationFrame(render)
return () => {
window.removeEventListener('resize', resize)
window.cancelAnimationFrame(frame)
}
}, [])
const validateBilling = (details: BillingDetails) => {
  const errors: Partial<Record<keyof BillingDetails, string>> = {}
  const required: Array<keyof BillingDetails> = ['billing_name', 'billing_email', 'address_line1', 'city', 'state', 'postal_code']
  for (const key of required) {
    if (!details[key].trim()) errors[key] = 'This field is required.'
  }
  if (!errors.billing_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.billing_email.trim())) errors.billing_email = 'Enter a valid email address.'
  if (!errors.postal_code && !/^[0-9]{6}$/.test(details.postal_code.trim())) errors.postal_code = 'Enter a valid 6-digit PIN code.'
  return errors
}
const openBilling = async (pack: Pack) => {
if (!pack.packageKey || paymentBusy || billingLoading) return
setBillingError(null)
setBillingLoading(true)
try {
const { data } = await supabase.auth.getSession()
const token = data.session?.access_token
if (!token) { setPaymentSucceeded(false); setPaymentMessage('Please sign in to your CVeat account before purchasing Career Credits.'); return }
const response = await fetch('/api/billing/profile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
const result = await response.json()
if (!response.ok) throw new Error(result.error || 'Unable to load billing details.')
setBilling(result.billing ? { ...emptyBilling, ...result.billing, country: 'IN' } : { ...emptyBilling, billing_email: data.session?.user.email || '' })
setBillingPack(pack)
} catch (error) {
setPaymentSucceeded(false)
setPaymentMessage(error instanceof Error ? error.message : 'Unable to load billing details.')
} finally { setBillingLoading(false) }
}
const submitBilling = async (event: React.FormEvent<HTMLFormElement>) => {
event.preventDefault()
if (!billingPack || paymentBusy) return
const pack = billingPack
const cleanedBilling: BillingDetails = {
  ...billing,
  billing_name: billing.billing_name.trim(),
  billing_email: billing.billing_email.trim(),
  address_line1: billing.address_line1.trim(),
  address_line2: billing.address_line2.trim(),
  city: billing.city.trim(),
  state: billing.state.trim(),
  postal_code: billing.postal_code.trim(),
}
const errors = validateBilling(cleanedBilling)
setBillingFieldErrors(errors)
if (Object.keys(errors).length) {
  setBillingError('Please complete the highlighted billing fields before continuing.')
  return
}
setBillingError(null)
setPaymentBusy(pack.packageKey || null)
try {
const { data } = await supabase.auth.getSession()
const token = data.session?.access_token
if (!token) throw new Error('Please sign in again.')
const response = await fetch('/api/billing/profile', {
method: 'PUT',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify(cleanedBilling),
})
const result = await response.json()
if (!response.ok) throw new Error(result.error || 'Unable to save billing details.')
setBillingPack(null)
await buyCredits(pack, result.billing as BillingDetails)
} catch (error) {
setBillingError(error instanceof Error ? error.message : 'Unable to save billing details.')
setPaymentBusy(null)
}
}
const buyCredits = async (pack: Pack, purchaseBilling: BillingDetails) => {
if (!pack.packageKey) return
setPaymentBusy(pack.packageKey)
setPaymentMessage(null)
setPaymentSucceeded(false)
try {
const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
const accessToken = sessionData.session?.access_token
if (sessionError || !accessToken) {
setPaymentMessage('Please sign in to your Cveat account before purchasing Career Credits.')
return
}
// Load checkout before creating an order; the server chooses the price.
const Razorpay = await loadRazorpay()
const orderResponse = await fetch('/api/payments/create-order', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${accessToken}`,
},
body: JSON.stringify({ packageKey: pack.packageKey, billing: purchaseBilling }),
})
const order = await orderResponse.json()
if (!orderResponse.ok) {
throw new Error(order.error || 'Unable to prepare your payment.')
}
if (!order.orderId || !order.purchaseId || !order.keyId) {
throw new Error('Incomplete payment order. Please try again.')
}
let paymentStarted = false
const checkout = new Razorpay({
key: order.keyId,
amount: order.amount,
currency: order.currency,
name: 'CVeat',
description: `${order.packageName} — ${order.credits} Career Credits`,
order_id: order.orderId,
prefill: { email: purchaseBilling.billing_email },
theme: { color: '#4f46e5' },
modal: {
ondismiss: () => {
if (!paymentStarted) setPaymentBusy(null)
},
},
handler: async (response) => {
paymentStarted = true
setPaymentMessage('Payment received. Verifying and adding your credits…')
try {
// Refresh auth in case the customer kept checkout open for a while.
const { data: refreshed } = await supabase.auth.getSession()
const token = refreshed.session?.access_token
if (!token) throw new Error('Session expired. Sign in again to check your credits.')
const verifyResponse = await fetch('/api/payments/verify', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${token}`,
},
body: JSON.stringify({
purchaseId: order.purchaseId,
razorpay_order_id: response.razorpay_order_id,
razorpay_payment_id: response.razorpay_payment_id,
razorpay_signature: response.razorpay_signature,
}),
})
const result = await verifyResponse.json()
if (!verifyResponse.ok || !result.success) {
throw new Error(result.error || 'Unable to confirm credits yet.')
}
setPaymentSucceeded(true)
setPaymentMessage(`${order.credits} Career Credits added successfully! Refresh your dashboard to see your updated balance.`)
} catch (error) {
setPaymentSucceeded(false)
setPaymentMessage(
`${error instanceof Error ? error.message : 'Verification is pending.'} If payment was captured, do not pay again. Contact support@cveat.in with your payment details.`
)
} finally {
setPaymentBusy(null)
}
},
})
checkout.on('payment.failed', () => {
setPaymentMessage('Payment was unsuccessful. No credits have been added.')
setPaymentBusy(null)
})
checkout.open()
} catch (error) {
setPaymentMessage(error instanceof Error ? error.message : 'Unable to start payment.')
setPaymentBusy(null)
}
}
const submitEnterprise = (event: React.FormEvent<HTMLFormElement>) => {
event.preventDefault()
const subject = `Cveat Enterprise Enquiry - ${company.trim()}`
const body = [
`Company: ${company.trim()}`,
`Contact: ${contact.trim()}`,
`Business email: ${email.trim()}`,
`Hiring needs: ${requirement}`,
'', 'Message:', message.trim(),
].join('\n')
window.location.href = `mailto:support@cveat.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
return (
<main className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-300">
<section className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-50/80 via-[#fafaff] to-white px-4 pb-16 pt-6 sm:px-6 sm:pt-8 dark:from-[#101A32] dark:via-[#0E172B] dark:to-[#0B1120] transition-colors duration-300">
<canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-40" />
<canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.65] dark:opacity-80" />
<div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl dark:bg-indigo-500/10 transition-colors duration-300" />
<div aria-hidden="true" className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-500/10 transition-colors duration-300" />
<div className="relative z-10 mx-auto max-w-6xl">
<header className="mb-10 text-center">
<Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors duration-300">← Back to Home</Link>
<div className="mx-auto mt-4 w-fit rounded-full border border-indigo-100 bg-white/90 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-600 shadow-sm dark:bg-[#1B263B] dark:text-indigo-300 dark:border-slate-700/70 dark:shadow-black/25 transition-colors duration-300">✦ Simple & transparent pricing</div>
<h1 className="mt-4 text-[32px] font-black leading-[1.13] tracking-tight text-slate-950 sm:text-[42px] lg:text-[48px] dark:text-slate-100 transition-colors duration-300">
Your next opportunity.<br />
<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-violet-300 transition-colors duration-300">Your perfect plan.</span>
</h1>
<p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 transition-colors duration-300">Create your CV for free. When you need extra AI assistance, choose Career Credits that suit your journey.</p>
</header>
<div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
{packs.map((pack) => (
<article key={pack.name} className={`group relative flex h-full flex-col rounded-[26px] border bg-white p-5 shadow-[0_12px_35px_rgba(37,43,94,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(79,70,229,0.15)] sm:p-6 dark:bg-[#1B263B] dark:shadow-black/25 dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.28)] dark:hover:shadow-black/25 ${pack.popular ? 'border-indigo-500 ring-2 ring-indigo-500/15 dark:border-indigo-400/70 dark:ring-indigo-400/20' : 'border-indigo-100 hover:border-indigo-300 dark:border-slate-700/70 dark:hover:border-indigo-400/60'}`}>
{pack.popular && <span className="absolute -top-3 right-6 flex h-7 w-32 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md dark:shadow-black/25 transition-colors duration-300">Most Popular</span>}
<div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-6">
<div className="flex min-w-0 flex-col">
<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl font-black text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300 transition-colors duration-300">{pack.free ? '✦' : pack.popular ? '↗' : '◎'}</div>
<div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300 transition-colors duration-300">{pack.eyebrow}</div>
<h2 className="mt-1 text-[23px] font-extrabold tracking-tight text-slate-950 dark:text-slate-100 transition-colors duration-300">{pack.name}</h2>
<p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 transition-colors duration-300">{pack.description}</p>
<div className="mt-auto pt-4"><span className="text-[34px] font-black leading-none tracking-tight">{pack.price}</span><span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 transition-colors duration-300">{pack.free ? '/ forever' : '/ one-time'}</span></div>
</div>
<div className="flex min-w-0 flex-col justify-between border-t border-slate-100 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-1 dark:border-slate-700/70 transition-colors duration-300">
<ul className="space-y-3">{pack.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-xs leading-5 text-slate-600 dark:text-slate-300 transition-colors duration-300"><span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-black text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300 transition-colors duration-300">✓</span><span>{feature}</span></li>)}</ul>
{pack.free ? (
<Link href="/" className="mt-5 flex w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs font-extrabold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white dark:bg-indigo-400/15 dark:text-indigo-200 dark:border-slate-700/70 dark:hover:bg-indigo-600 dark:hover:text-white">Start building free →</Link>
) : (
<button type="button" disabled={paymentBusy !== null || billingLoading} onClick={() => void openBilling(pack)} className={`mt-5 flex w-full items-center justify-center rounded-xl px-3 py-3 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${pack.popular ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700' : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white dark:border-slate-700 dark:bg-indigo-400/15 dark:text-indigo-200 dark:hover:bg-indigo-600 dark:hover:text-white'}`}>{paymentBusy === pack.packageKey ? 'Preparing payment…' : billingLoading ? 'Loading billing…' : 'Buy Career Credits →'}</button>
)}
</div>
</div>
</article>
))}
</div>
<section className="relative mt-8 overflow-hidden rounded-[28px] border border-indigo-900/60 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-9 dark:shadow-black/25 transition-colors duration-300">
<div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden="true" />
<div className="relative grid gap-7 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
<div>
<span className="inline-flex rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-200">Cveat for Business</span>
<h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Smarter hiring, built around your team.</h2>
<p className="mt-3 max-w-lg text-sm leading-7 text-indigo-100/80">From discovering suitable candidates to AI-assisted screening and structured interviews, let's design a recruitment workflow that fits your hiring goals.</p>
<div className="mt-6 flex flex-wrap items-center gap-3"><span className="text-2xl font-extrabold">Custom pricing</span><span className="text-xs text-indigo-200">Based on hiring volume and requirements</span></div>
<button type="button" onClick={() => setEnterpriseOpen(true)} className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-indigo-900 transition-colors hover:bg-indigo-100 dark:bg-[#1B263B] dark:text-indigo-200 dark:hover:bg-[#26344D]">Enquire about Enterprise →</button>
</div>
<div className="grid gap-4 sm:grid-cols-2">
{[
['Candidate sourcing', 'Assistance identifying relevant talent'],
['AI-assisted screening', 'Structured, role-based resume reviews'],
['Interview workflows', 'AI-assisted interview questions and evaluations'],
['Hiring insights', 'Candidate comparisons and screening summaries'],
].map(([title, detail]) => (
<div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 text-lg text-indigo-200">✦</div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-indigo-100/70">{detail}</p></div>
))}
</div>
</div>
</section>
<p className="mt-7 text-center text-xs leading-6 text-slate-500 dark:text-slate-400 transition-colors duration-300">Career Credit packs are one-time purchases, not subscriptions. Availability is controlled by Cveat. New eligible accounts receive 3 one-time welcome credits; there are no automatic daily or monthly refills.</p>
</div>
</section>
{billingPack && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !paymentBusy) setBillingPack(null) }}>
<div role="dialog" aria-modal="true" aria-labelledby="billing-title" className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8 dark:bg-[#1B263B] dark:shadow-black/25 transition-colors duration-300">
<div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black tracking-tight text-indigo-600 dark:text-indigo-300 transition-colors duration-300">CVeat</p><h2 id="billing-title" className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100 transition-colors duration-300">Billing details</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">{billingPack.name} · {billingPack.price} one-time purchase</p></div><button type="button" disabled={paymentBusy !== null} onClick={() => setBillingPack(null)} aria-label="Close billing form" className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-[#26344D] transition-colors duration-300">×</button></div>
<form onSubmit={(event) => void submitBilling(event)} noValidate className="mt-5 space-y-3">
{([['billing_name','Full billing name','text'],['billing_email','Email for receipt','email'],['address_line1','Address line 1','text'],['address_line2','Address line 2 (optional)','text'],['city','City','text'],['state','State / Union Territory','text'],['postal_code','6-digit PIN code','text']] as const).map(([key,label,type]) => <label key={key} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">{label}{key !== 'address_line2' && <span className="ml-1 text-red-600 dark:text-red-300 transition-colors duration-300" aria-hidden="true">*</span>}<input type={type} required={key !== 'address_line2'} aria-invalid={Boolean(billingFieldErrors[key])} maxLength={key === 'postal_code' ? 6 : key === 'billing_email' ? 254 : 150} inputMode={key === 'postal_code' ? 'numeric' : undefined} pattern={key === 'postal_code' ? '[0-9]{6}' : undefined} value={billing[key]} onChange={(event) => { setBilling((prev) => ({ ...prev, [key]: event.target.value })); setBillingFieldErrors((prev) => ({ ...prev, [key]: undefined })); setBillingError(null) }} className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark] ${billingFieldErrors[key] ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25'}`} />{billingFieldErrors[key] && <span className="mt-1 block text-xs font-medium text-red-600 dark:text-red-300 transition-colors duration-300" role="alert">{billingFieldErrors[key]}</span>}</label>)}
<p className="text-xs leading-5 text-slate-500 dark:text-slate-400 transition-colors duration-300">Billing address must be in India. GST is not charged separately. This purchase is for Career Credits, not a subscription.</p>
{billingError && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-300 transition-colors duration-300">{billingError}</p>}
<button type="submit" disabled={paymentBusy !== null} className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{paymentBusy ? 'Preparing checkout…' : `Continue to secure payment · ${billingPack.price} →`}</button>
</form>
</div>
</div>}
{paymentMessage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !paymentBusy) setPaymentMessage(null) }}><div role="dialog" aria-modal="true" aria-labelledby="payment-message-title" className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-[#1B263B] dark:shadow-black/25 transition-colors duration-300"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300 transition-colors duration-300">✦</div><h2 id="payment-message-title" className="mt-4 text-2xl font-black">{paymentSucceeded ? 'Payment successful!' : 'Payment update'}</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 transition-colors duration-300">{paymentMessage}</p><button type="button" disabled={paymentBusy !== null} onClick={() => setPaymentMessage(null)} className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">OK</button></div></div>}
{enterpriseOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEnterpriseOpen(false) }}><div role="dialog" aria-modal="true" aria-labelledby="enterprise-title" className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8 dark:bg-[#1B263B] dark:shadow-black/25 transition-colors duration-300"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 transition-colors duration-300">Cveat for Business</p><h2 id="enterprise-title" className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100 transition-colors duration-300">Tell us about your hiring needs</h2></div><button type="button" onClick={() => setEnterpriseOpen(false)} aria-label="Close enquiry form" className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#26344D] transition-colors duration-300">×</button></div><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400 transition-colors duration-300">Submitting opens your email application with a prepared message to support@cveat.in. Please send the email to complete your enquiry.</p><form onSubmit={submitEnterprise} className="mt-5 space-y-4">{[
{ label: 'Company name', value: company, setter: setCompany, type: 'text' },
{ label: 'Your name', value: contact, setter: setContact, type: 'text' },
{ label: 'Business email', value: email, setter: setEmail, type: 'email' },
].map((field) => <label key={field.label} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">{field.label}<input required type={field.type} value={field.value} onChange={(event) => field.setter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/70 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark] dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25 transition-colors duration-300" /></label>)}<label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">What do you need?<select required value={requirement} onChange={(event) => setRequirement(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 dark:bg-[#1B263B] dark:border-slate-700/70 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark] dark:focus:border-indigo-400 transition-colors duration-300"><option value="">Select a service</option><option>Candidate sourcing</option><option>AI-assisted screening</option><option>AI interview workflows</option><option>End-to-end recruitment support</option><option>Custom enterprise solution</option></select></label><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">Tell us more<textarea required rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Roles, hiring volume, timelines or other requirements" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 dark:border-slate-700/70 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark] dark:focus:border-indigo-400 transition-colors duration-300" /></label><button type="submit" className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Open email to send enquiry →</button></form></div></div>}
</main>
)
}
