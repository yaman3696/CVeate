'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
export default function LandingPage() {
const router = useRouter()
const canvasRef = useRef<HTMLCanvasElement | null>(null)
const scrollContainerRef = useRef<HTMLDivElement | null>(null)
const [testimonials, setTestimonials] = useState<any[]>([])
const [latestBlogs, setLatestBlogs] = useState<any[]>([])
const [currentUserId, setCurrentUserId] = useState<string | null>(null)
// Testimonial Modal State
const [isAddModalOpen, setIsAddModalOpen] = useState(false)
const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)
const [isAllTestimonialsOpen, setIsAllTestimonialsOpen] = useState(false)
const [isEditing, setIsEditing] = useState(false)
const [editingId, setEditingId] = useState<string | null>(null)
const [newTestimonial, setNewTestimonial] = useState({
name: '',
profession: '',
rating: 5,
text: '',
})
const [formError, setFormError] = useState('')
const [isAdmin, setIsAdmin] = useState(false)
// Check active user session, admin status, and load user ID
useEffect(() => {
const checkUserSession = async () => {
const { data: { user } } = await supabase.auth.getUser()
const OWNER_EMAIL = 'yaman.kashyap@gmail.com'
if (user) {
setCurrentUserId(user.id)
if (user.email === OWNER_EMAIL) {
setIsAdmin(true)
}
} else {
setCurrentUserId(null)
setIsAdmin(false)
}
}
checkUserSession()
}, [])
// Fetch latest 3 blogs from Supabase[cite: 6]
useEffect(() => {
const fetchLatestBlogs = async () => {
const { data, error } = await supabase
.from('blogs')
.select('*')
.order('created_at', { ascending: false })
.limit(3)
if (data) {
setLatestBlogs(data)
}
}
fetchLatestBlogs()
}, [])
// Fetch testimonials and sort so user's own testimonial is always on top
const fetchTestimonials = async () => {
const { data: { user } } = await supabase.auth.getUser()
const userId = user?.id
const { data, error } = await supabase
.from('testimonials')
.select('*')
.order('created_at', { ascending: false })
let items = []
if (data && data.length > 0) {
items = data
} else {
items = [
{
id: '1',
name: 'Yaman K.',
profession: 'Senior Creative Designer',
rating: 5,
text: 'The ATS export format is incredible. I applied to 5 companies with a resume built here and got 4 interview callbacks within a week!',
initial: 'Y'
},
{
id: '2',
name: 'Sakshi S.',
profession: 'UI/UX Product Specialist',
rating: 5,
text: 'Clean layout, no annoying website clutter on the PDF export, and super intuitive onboarding wizard. Highly recommend!',
initial: 'S'
},
{
id: '3',
name: 'Rahul M.',
profession: 'Frontend Software Engineer',
rating: 5,
text: 'Most resume builders trap your data behind paywalls or output messy code. Cveat is lightning fast and gets straight to the point.',
initial: 'R'
},
{
id: '4',
name: 'Priya D.',
profession: 'Product Marketing Manager',
rating: 5,
text: 'The clean structure helped me pass corporate ATS filters seamlessly. Landed my dream role in less than a month of active searching.',
initial: 'P'
},
{
id: '5',
name: 'Aniket V.',
profession: 'Full Stack Developer',
rating: 5,
text: 'Absolute lifesaver! The layout looks professional, prints cleanly without browser headers, and respects modern typographic standards.',
initial: 'A'
}
]
}
// Sort items so current user's review is always pinned to the top
if (userId) {
items.sort((a, b) => {
if (a.user_id === userId) return -1
if (b.user_id === userId) return 1
return 0
})
}
setTestimonials(items)
}
useEffect(() => {
fetchTestimonials()
}, [])
// Check if user is logged in before opening Add Testimonial modal
const handleOpenAddModal = async () => {
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
setIsLoginPromptOpen(true)
return
}
// Check if user already submitted one
const existing = testimonials.find(t => t.user_id === session.user.id)
if (existing) {
handleOpenEditModal(existing)
return
}
setIsEditing(false)
setEditingId(null)
setNewTestimonial({ name: '', profession: '', rating: 5, text: '' })
setFormError('')
setIsAddModalOpen(true)
}
const handleOpenEditModal = (item: any) => {
setIsEditing(true)
setEditingId(item.id)
setNewTestimonial({
name: item.name,
profession: item.profession,
rating: item.rating,
text: item.text,
})
setFormError('')
setIsAddModalOpen(true)
}
const scrollLeft = () => {
if (scrollContainerRef.current) {
scrollContainerRef.current.scrollBy({ left: -380, behavior: 'smooth' })
}
}
const scrollRight = () => {
if (scrollContainerRef.current) {
scrollContainerRef.current.scrollBy({ left: 380, behavior: 'smooth' })
}
}
useEffect(() => {
const interval = setInterval(() => {
if (scrollContainerRef.current) {
const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
if (scrollLeft + clientWidth >= scrollWidth - 10) {
scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
} else {
scrollContainerRef.current.scrollBy({ left: 380, behavior: 'smooth' })
}
}
}, 4500)
return () => clearInterval(interval)
}, [])
const handleAddTestimonialSubmit = async (e: React.FormEvent) => {
e.preventDefault()
if (!newTestimonial.name.trim() || !newTestimonial.profession.trim() || !newTestimonial.text.trim()) {
setFormError('Please fill out all required fields.')
return
}
const wordCount = newTestimonial.text.trim().split(/\s+/).length
if (wordCount > 250) {
setFormError(`Testimonial exceeds 250 words (currently ${wordCount} words).`)
return
}
try {
const { data: { user }, error: userError } = await supabase.auth.getUser()
if (userError || !user) {
throw new Error('Unauthorized: You must be logged in to submit a testimonial.')
}
const payload = {
name: newTestimonial.name,
profession: newTestimonial.profession,
rating: Number(newTestimonial.rating),
text: newTestimonial.text,
initial: newTestimonial.name.charAt(0).toUpperCase(),
user_id: user.id
}
// Check if user already has a testimonial in the database
const { data: existingReview } = await supabase
.from('testimonials')
.select('id')
.eq('user_id', user.id)
.maybeSingle()
let error
if (existingReview) {
// Explicitly update if it exists (bypasses upsert RLS conflict errors)
const res = await supabase
.from('testimonials')
.update(payload)
.eq('user_id', user.id)
error = res.error
} else {
// Explicitly insert if it's new
const res = await supabase
.from('testimonials')
.insert([payload])
error = res.error
}
if (error) throw error
await fetchTestimonials()
setNewTestimonial({ name: '', profession: '', rating: 5, text: '' })
setFormError('')
setIsAddModalOpen(false)
setIsEditing(false)
setEditingId(null)
} catch (err: any) {
setFormError(err.message || 'Failed to save testimonial.')
}
}
useEffect(() => {
const canvas = canvasRef.current
if (!canvas) return
const ctx = canvas.getContext('2d')
if (!ctx) return
let animationFrameId: number
let width = (canvas.width = canvas.offsetWidth)
let height = (canvas.height = canvas.offsetHeight)
const handleResize = () => {
if (!canvas) return
width = canvas.width = canvas.offsetWidth
height = canvas.height = canvas.offsetHeight
}
window.addEventListener('resize', handleResize)
const particles = Array.from({ length: 30 }, () => ({
x: Math.random() * width,
y: Math.random() * height,
vx: (Math.random() - 0.5) * 0.6,
vy: (Math.random() - 0.5) * 0.6,
radius: Math.random() * 2 + 1.5,
}))
const render = () => {
ctx.clearRect(0, 0, width, height)
for (let i = 0; i < particles.length; i++) {
for (let j = i + 1; j < particles.length; j++) {
const dx = particles[i].x - particles[j].x
const dy = particles[i].y - particles[j].y
const dist = Math.sqrt(dx * dx + dy * dy)
if (dist < 120) {
ctx.strokeStyle = `rgba(99, 102, 241, ${0.12 * (1 - dist / 120)})`
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(particles[i].x, particles[i].y)
ctx.lineTo(particles[j].x, particles[j].y)
ctx.stroke()
}
}
}
particles.forEach((p) => {
p.x += p.vx
p.y += p.vy
if (p.x < 0 || p.x > width) p.vx *= -1
if (p.y < 0 || p.y > height) p.vy *= -1
ctx.fillStyle = 'rgba(99, 102, 241, 0.25)'
ctx.beginPath()
ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
ctx.fill()
})
animationFrameId = requestAnimationFrame(render)
}
render()
return () => {
window.removeEventListener('resize', handleResize)
cancelAnimationFrame(animationFrameId)
}
}, [])
// FAQ Accordion State
const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
const faqs = [
{
question: 'What is an ATS optimized resume and why do I need one?',
answer: 'An Applicant Tracking System is software used by corporate recruiters to automatically scan, parse, and rank job applications before a human ever reads them. If your resume contains heavy graphic design elements, multi column layouts, or missing keyword terms, the software will filter you out automatically. Cveat formats your career details into clean structured layouts that pass corporate filters seamlessly.'
},
{
question: 'Can I build and download my resume for free on Cveat?',
answer: 'Yes. You can use our guided 4 step resume builder completely free without any mandatory login or hidden paywalls. When you finish, you can instantly export your document into a professional PDF that prints cleanly and maintains strict typographic standards.'
},
{
question: 'How does the AI ATS resume checker work?',
answer: 'Our AI scanner allows you to paste any target job description and upload your resume document. It evaluates your skills against the job requirements, detects missing critical keywords, calculates your recruiter match score, and gives you a step by step optimization plan.'
},
{
question: 'How do the free daily check credits renew?',
answer: 'Every user starts on our Freemium plan with 2 free ATS check credits that automatically refresh every 24 hours. If you upgrade to a Daily Pass or Monthly Pass, your credits are scaled accordingly and will safely transition back to your standard freemium limits once your pass duration ends.'
},
{
question: 'Is my personal data and resume content secure?',
answer: 'Your privacy and data security are our top priorities. All data transmitted through Cveat is encrypted, stored securely in database profiles, and never sold or shared with third party advertisers or recruiters without your explicit permission.'
}
]
return (
<div className="min-h-screen bg-white text-slate-900">
<style jsx global>{`
@keyframes siriPulse {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
70% { transform: scale(1.05); box-shadow: 0 0 0 30px rgba(99, 102, 241, 0); }
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}
.siri-orb { animation: siriPulse 2.8s infinite cubic-bezier(0.4, 0, 0.6, 1); }
@keyframes atsGlobeSpin { 0% { transform: rotate(-8deg) scaleX(.97); } 50% { transform: rotate(8deg) scaleX(1); } 100% { transform: rotate(-8deg) scaleX(.97); } }
@keyframes atsGlobePulse { 0%, 100% { transform: scale(.95); box-shadow: 0 0 20px rgba(99,102,241,.35); } 50% { transform: scale(1.05); box-shadow: 0 0 42px rgba(99,102,241,.55); } }
@keyframes atsIconRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.ats-globe-spin { animation: atsGlobeSpin 8s ease-in-out infinite; }
.ats-globe-pulse { animation: atsGlobePulse 3.5s ease-in-out infinite; }
.ats-icon-rotate { animation: atsIconRotate 24s linear infinite; }
@media (prefers-reduced-motion: reduce) { .ats-globe-spin, .ats-globe-pulse, .ats-icon-rotate { animation: none; } }
`}</style>
{/* Unified CV Builder + ATS Checker Hero */}
<section className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-50/70 via-[#fafaff] to-white px-4 pb-10 pt-6 text-slate-900 sm:px-6 sm:pt-9 lg:pb-12 lg:pt-10">
<canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
<div aria-hidden="true" className="pointer-events-none absolute -left-32 top-44 h-96 w-96 rounded-full bg-indigo-200/25 blur-3xl" />
<div aria-hidden="true" className="pointer-events-none absolute -right-28 top-36 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
{/* Soft mobile background accents: visible behind content, never cover controls */}
<div aria-hidden="true" className="pointer-events-none absolute -left-16 top-36 h-48 w-36 -rotate-12 rounded-2xl border border-indigo-200/40 bg-white/20 p-4 opacity-40 sm:left-0 sm:top-28 sm:h-56 sm:w-44 xl:hidden">
<div className="mb-4 h-6 w-6 rounded-full bg-indigo-300/50" />
<div className="mb-3 h-2 w-4/5 rounded-full bg-indigo-300/50" />
<div className="mb-6 h-2 w-2/3 rounded-full bg-indigo-200/50" />
<div className="mb-3 h-2 w-full rounded-full bg-indigo-200/60" />
<div className="mb-3 h-2 w-4/5 rounded-full bg-indigo-200/60" />
</div>
<div aria-hidden="true" className="pointer-events-none absolute -right-20 top-40 h-52 w-52 rounded-full border border-indigo-300/30 opacity-45 sm:-right-12 sm:top-24 sm:h-64 sm:w-64 xl:hidden">
<div className="absolute inset-5 rounded-full border border-dashed border-indigo-400/40 ats-globe-spin" />
<div className="absolute inset-10 rounded-full border border-dotted border-violet-400/50" />
<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-indigo-300/35 px-3 py-2 text-sm font-bold text-indigo-600/60">ATS</div>
</div>
<div aria-hidden="true" className="pointer-events-none absolute left-2 top-[355px] -rotate-6 rounded-full border border-indigo-200/50 bg-white/50 px-3 py-1 text-[9px] font-semibold text-indigo-400/70 sm:left-6 xl:hidden">ATS-Friendly CV</div>
<div aria-hidden="true" className="pointer-events-none absolute right-2 top-[360px] rotate-6 rounded-full border border-indigo-200/50 bg-white/50 px-3 py-1 text-[9px] font-semibold text-indigo-400/70 sm:right-6 xl:hidden">Keyword Match</div>
{/* Light illustrative decorations on large screens */}
<div aria-hidden="true" className="pointer-events-none absolute left-[max(1%,calc(50%-780px))] top-[145px] hidden w-64 -rotate-6 opacity-30 xl:block 2xl:w-72">
<div className="rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-[0_24px_80px_rgba(99,102,241,0.12)]">
<div className="flex items-center gap-3 border-b border-indigo-100 pb-4">
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg text-indigo-500">◉</div>
<div className="flex-1 space-y-2"><div className="h-2 w-24 rounded-full bg-indigo-300"/><div className="h-1.5 w-16 rounded-full bg-slate-200"/></div>
</div>
{['EXPERIENCE', 'EDUCATION', 'SKILLS'].map((heading) => (
<div key={heading} className="mt-4 space-y-2">
<div className="text-[9px] font-extrabold tracking-widest text-indigo-500">{heading}</div>
<div className="h-1.5 w-full rounded-full bg-indigo-100"/><div className="h-1.5 w-4/5 rounded-full bg-slate-100"/>
</div>
))}
</div>
</div>
<div aria-hidden="true" className="pointer-events-none absolute left-[4%] top-36 hidden -rotate-6 rounded-full border border-indigo-100 bg-white/85 px-4 py-2 text-xs font-semibold text-indigo-500 shadow-sm xl:block">Professional Templates</div>
<div aria-hidden="true" className="pointer-events-none absolute left-[3%] top-[410px] hidden rotate-3 rounded-full border border-indigo-100 bg-white/85 px-4 py-2 text-xs font-semibold text-indigo-500 shadow-sm xl:block">ATS-Friendly Format</div>
<div aria-hidden="true" className="pointer-events-none absolute left-[6%] top-[525px] hidden -rotate-3 rounded-full border border-indigo-100 bg-white/85 px-4 py-2 text-xs font-semibold text-indigo-500 shadow-sm xl:block">Clean PDF Export</div>
{/* Animated dotted-network ATS globe */}
<div aria-hidden="true" className="pointer-events-none absolute right-[max(1%,calc(50%-790px))] top-[160px] hidden h-[320px] w-[320px] opacity-30 xl:block 2xl:h-[370px] 2xl:w-[370px]">
<div className="ats-globe-spin absolute inset-5 rounded-full border border-indigo-300/60 shadow-[0_0_65px_rgba(99,102,241,0.24),inset_0_0_55px_rgba(99,102,241,0.13)]">
<svg viewBox="0 0 300 300" className="h-full w-full text-indigo-500" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="150" cy="150" r="135" stroke="currentColor" strokeOpacity=".55" strokeWidth="1" strokeDasharray="2 5"/>
<ellipse cx="150" cy="150" rx="57" ry="135" stroke="currentColor" strokeOpacity=".65" strokeDasharray="2 4"/>
<ellipse cx="150" cy="150" rx="104" ry="135" stroke="currentColor" strokeOpacity=".4" strokeDasharray="2 5"/>
<ellipse cx="150" cy="150" rx="135" ry="48" stroke="currentColor" strokeOpacity=".65" strokeDasharray="2 4"/>
<ellipse cx="150" cy="150" rx="135" ry="95" stroke="currentColor" strokeOpacity=".45" strokeDasharray="2 5"/>
<path d="M15 150H285M150 15V285" stroke="currentColor" strokeOpacity=".3" strokeDasharray="2 5"/>
{Array.from({ length: 12 }, (_, i) => {
const angle = (i * Math.PI) / 6;
const cx = Number((150 + 135 * Math.cos(angle)).toFixed(4));
const cy = Number((150 + 135 * Math.sin(angle)).toFixed(4));
return (
<circle
key={i}
cx={cx}
cy={cy}
r="3"
fill="currentColor"
fillOpacity=".7"
/>
);
})}
</svg>
</div>
<div className="ats-globe-pulse absolute inset-[33%] flex items-center justify-center rounded-3xl border border-indigo-200 bg-indigo-600/85 text-2xl font-black tracking-wider text-white shadow-[0_0_35px_rgba(79,70,229,0.4)]">ATS</div>
</div>
<div aria-hidden="true" className="pointer-events-none absolute right-[3%] top-[160px] hidden rotate-3 rounded-2xl border border-indigo-100 bg-white/90 px-5 py-3 text-xs font-semibold text-slate-500 shadow-sm xl:block">Match Score <span className="ml-2 font-extrabold text-emerald-500">85% <span className="font-normal text-slate-400">sample</span></span></div>
<div aria-hidden="true" className="pointer-events-none absolute right-[1.5%] top-[405px] hidden -rotate-3 rounded-2xl border border-indigo-100 bg-white/90 px-5 py-3 text-xs font-semibold text-slate-500 shadow-sm xl:block">Keyword Gap <span className="ml-2 font-bold text-indigo-600">Analysis</span></div>
<div aria-hidden="true" className="pointer-events-none absolute right-[4%] top-[525px] hidden rotate-2 rounded-2xl border border-indigo-100 bg-white/90 px-5 py-3 text-xs font-semibold text-slate-500 shadow-sm xl:block">Smart Suggestions <span className="ml-1 font-bold text-indigo-600">✦</span></div>
<div className="relative z-10 mx-auto max-w-[940px] text-center">
<div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-600 shadow-sm sm:text-xs">
<span className="text-base">✦</span> AI-powered career toolkit
</div>
<h1 className="mx-auto mt-4 max-w-4xl text-[38px] font-black leading-[1.06] tracking-[-0.045em] text-slate-950 sm:mt-5 sm:text-[56px] lg:text-[68px]">
Build Your CV.<br />Ace Your <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Next Interview.</span>
</h1>
<p className="mx-auto mt-3 max-w-xl text-[13px] leading-5 text-slate-600 sm:mt-4 sm:text-sm sm:leading-6">
Create a professional CV for free, check your ATS match with AI, and prepare for your next interview-all in one place.
</p>
<div className="mx-auto mt-6 grid max-w-[860px] grid-cols-1 items-stretch gap-4 text-left md:mt-7 md:grid-cols-2">
{/* CV Builder - no account required */}
<div className="flex h-full flex-col rounded-[26px] border border-indigo-100 bg-white/95 p-5 shadow-[0_15px_45px_rgba(37,43,94,0.08)] transition-transform duration-300 hover:-translate-y-1 sm:p-6">
<div className="flex flex-wrap items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M14 3v6h5M9 13h7M9 17h7"/></svg>
</div>
<span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600">Free · No login required</span>
</div>
<h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">Create Your CV</h2>
<p className="mt-2 text-sm leading-6 text-slate-600">Build a professional, modern, ATS-friendly resume in minutes.</p>
<div className="mt-3 space-y-2 text-[13px] text-slate-600">
{['Guided resume builder', 'ATS-friendly layout', 'Download your CV as a PDF'].map((feature) => (
<div key={feature} className="flex items-center gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">✓</span><span>{feature}</span></div>
))}
</div>
<div className="mt-auto pt-5">
<Link href="/onboard" className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl">Create Your CV Now <span aria-hidden="true">→</span></Link>
</div>
</div>
{/* ATS Checker - intentionally emphasized */}
<div className="relative flex h-full flex-col rounded-[26px] border-2 border-violet-400/80 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/90 p-5 shadow-[0_20px_55px_rgba(99,102,241,0.18)] transition-transform duration-300 hover:-translate-y-1 sm:p-6">
<div className="absolute -top-4 right-5 rounded-full bg-indigo-600 px-4 py-2 text-[11px] font-bold text-white shadow-lg shadow-indigo-300">✦ AI-powered</div>
<div className="flex flex-wrap items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="ats-icon-rotate h-8 w-8"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></svg>
</div>
<span className="rounded-full bg-indigo-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">Login required</span>
</div>
<h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">Check ATS Score</h2>
<p className="mt-2 text-sm leading-6 text-slate-600">See how well your CV matches a job description and get actionable AI insights.</p>
<div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-100/70 px-3 py-3 text-sm font-bold text-indigo-700"><span aria-hidden="true">✦</span><span>Get 2 free ATS checks every 24 hours.</span></div>
<div className="mt-3 space-y-2 text-[13px] text-slate-600">
{['AI-powered ATS match score', 'Missing keyword analysis', 'Personalized improvement tips'].map((feature) => (
<div key={feature} className="flex items-center gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">✓</span><span>{feature}</span></div>
))}
</div>
<div className="mt-auto pt-5">
<Link href="/ats-checker" className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl">Check My ATS Score <span aria-hidden="true">→</span></Link>
</div>
</div>
</div>
<p className="mt-4 text-xs text-slate-500">Start with a free CV, or sign in to unlock your ATS match insights.</p>
</div>
</section>
{/* Interview Prep Spotlight - full-width indigo section */}
<section className="relative isolate overflow-hidden bg-indigo-700 px-5 py-16 text-white sm:px-8 sm:py-20 lg:py-24">
    <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
    <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-100 backdrop-blur-sm">
                <span aria-hidden="true">✦</span> AI-powered interview preparation
            </div>
            <h2 className="mx-auto mt-6 max-w-xl text-[38px] font-black leading-[1.1] tracking-tight sm:text-5xl lg:mx-0 lg:text-[56px]">
                Practice Smarter.<br /><span className="text-indigo-200">Interview Better.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-indigo-100/90 lg:mx-0">
                Prepare for real interview questions, receive detailed AI feedback, and build the confidence to stand out in your next interview.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-indigo-100 lg:justify-start">
                {['Role-focused questions', 'Actionable AI feedback', 'Track your progress'].map((feature) => (
                    <div key={feature} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>{feature}</div>
                ))}
            </div>
            <Link href="/interview-prep" className="mt-9 inline-flex items-center justify-center gap-3 rounded-xl bg-white px-7 py-3.5 text-sm font-extrabold text-indigo-700 shadow-[0_14px_32px_rgba(20,20,80,0.2)] transition-transform hover:-translate-y-1 hover:bg-indigo-50">
                Start Interview Prep <span aria-hidden="true" className="text-lg">→</span>
            </Link>
        </div>
        {/* Decorative interview dashboard preview: sample content, not real user results */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute -inset-5 rounded-[36px] bg-white/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/25 bg-white/95 p-5 text-slate-900 shadow-[0_28px_90px_rgba(15,15,70,0.28)] sm:p-7">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-xl text-indigo-600">✦</div>
                        <div><div className="text-sm font-extrabold">AI Interview Coach</div><div className="mt-0.5 text-xs text-slate-500">Practice session · Preview</div></div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Ready</span>
                </div>
                <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5">
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">Sample interview question</div>
                    <p className="mt-3 text-base font-bold leading-6 text-slate-800 sm:text-lg">"Tell me about a challenge you faced at work and how you solved it."</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-500"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-200/80">✦</span> Practice your response with AI</div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">◎</div><div className="mt-3 text-sm font-extrabold">Smart Feedback</div><p className="mt-1 text-xs leading-5 text-slate-500">Know what to improve</p></div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">↗</div><div className="mt-3 text-sm font-extrabold">Progress Insights</div><p className="mt-1 text-xs leading-5 text-slate-500">Learn from every attempt</p></div>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">✓</span>Personalized practice to help you feel interview-ready.</div>
            </div>
            <div className="absolute -right-2 -top-5 hidden rotate-3 rounded-xl border border-white/30 bg-violet-500 px-4 py-2 text-xs font-bold text-white shadow-lg sm:block">✦ Practice with AI</div>
        </div>
    </div>
</section>
{/* About Section */}
<section id="about" className="mx-auto max-w-6xl px-6 py-20 border-t border-slate-100 text-center">
<h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">About Cveate</h2>
<p className="mt-4 text-base text-slate-600 max-w-6xl mx-auto leading-relaxed">
Cveat was born out of a universal job-seeking frustration: qualified professionals losing career opportunities simply because automated Applicant Tracking Systems (ATS) reject beautifully styled resumes over hidden formatting elements. We built Cveat to bridge this gap, combining a sleek, modern web experience with strict, recruiter-approved document exporting. By fixing common resume issues like columns and graphic text that cause your CV to fail ATS scans, our platform ensures your true skills and professional achievements always shine through to human hiring managers.
</p>
</section>
{/* Features Section */}
<section className="mx-auto max-w-6xl px-6 py-16 border-t border-slate-100">
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-600 hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200/70">
<div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4 transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">01</div>
<h3 className="text-lg font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-white">4-Step Guided Wizard</h3>
<p className="text-sm text-slate-600 transition-colors duration-300 group-hover:text-indigo-50">Quickly input your personal details, work experience, education, and skills without feeling overwhelmed.</p>
</div>
<div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-600 hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200/70">
<div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4 transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">02</div>
<h3 className="text-lg font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-white">ATS-Friendly Layouts</h3>
<p className="text-sm text-slate-600 transition-colors duration-300 group-hover:text-indigo-50">Designed specifically to parse cleanly through automated corporate tracking systems and recruiter filters.</p>
</div>
<div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-600 hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200/70">
<div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4 transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">03</div>
<h3 className="text-lg font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-white">Instant PDF Export</h3>
<p className="text-sm text-slate-600 transition-colors duration-300 group-hover:text-indigo-50">Export your resume into a clean, professional PDF document with one click-no formatting mess.</p>
</div>
</div>
</section>
{/* Testimonials Section */}
<section className="mx-auto max-w-6xl px-6 py-16 border-t border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-indigo-100/40 rounded-3xl my-10">
<div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
<div className="text-center sm:text-left">
<h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Trusted by Modern Professionals</h2>
<p className="mt-1 text-sm text-slate-600">See how Cveat helped job seekers land interviews faster.</p>
</div>
<div className="flex items-center gap-3 flex-wrap justify-center">
<button
onClick={() => setIsAllTestimonialsOpen(true)}
className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-all whitespace-nowrap cursor-pointer"
>
See All Testimonials ({testimonials.length})
</button>
<button
onClick={handleOpenAddModal}
className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all whitespace-nowrap cursor-pointer"
>
{testimonials.some(t => t.user_id === currentUserId) ? 'Edit Your Testimonial' : '+ Add Testimonial'}
</button>
<div className="flex items-center gap-1.5">
<button onClick={scrollLeft} className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all font-bold shadow-sm cursor-pointer">
<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
</button>
<button onClick={scrollRight} className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all font-bold shadow-sm cursor-pointer">
<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
</button>
</div>
</div>
</div>
<div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto scrollbar-none pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
{testimonials.slice(0, 6).map((item) => (
<div key={item.id} className="min-w-[320px] max-w-[360px] flex-1 snap-start bg-white rounded-2xl border border-indigo-100 p-7 shadow-sm flex flex-col justify-between relative">
<div>
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-1 text-amber-400 text-sm">
{Array.from({ length: item.rating }).map((_, i) => (<span key={i}>★</span>))}
</div>
{/* Edit button appears ONLY on the current user's written testimonial */}
{currentUserId && item.user_id === currentUserId && (
<button
onClick={() => handleOpenEditModal(item)}
className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
>
Edit Review
</button>
)}
</div>
<p className="text-sm text-slate-700 italic leading-relaxed">"{item.text}"</p>
</div>
<div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
<div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{item.initial}</div>
<div>
<h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
<p className="text-xs text-slate-500">{item.profession}</p>
</div>
</div>
</div>
))}
</div>
</section>
{/* See All Testimonials Modal */}
{isAllTestimonialsOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
<div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900 space-y-6">
<div className="flex items-center justify-between border-b border-slate-100 pb-4">
<div>
<h3 className="text-2xl font-extrabold text-slate-900">All Community Testimonials</h3>
<p className="text-xs text-slate-500">Read what professionals are saying about CVeat.</p>
</div>
<button
onClick={() => setIsAllTestimonialsOpen(false)}
className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center"
>
✕
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{testimonials.map((item) => (
<div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between relative">
<div>
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-1 text-amber-400 text-sm">
{Array.from({ length: item.rating }).map((_, i) => (<span key={i}>★</span>))}
</div>
{currentUserId && item.user_id === currentUserId && (
<button
onClick={() => {
setIsAllTestimonialsOpen(false)
handleOpenEditModal(item)
}}
className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
>
Edit Review
</button>
)}
</div>
<p className="text-sm text-slate-700 italic leading-relaxed">"{item.text}"</p>
</div>
<div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-200">
<div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{item.initial}</div>
<div>
<h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
<p className="text-xs text-slate-500">{item.profession}</p>
</div>
</div>
</div>
))}
</div>
</div>
</div>
)}
{/* Login Required Popup Modal */}
{isLoginPromptOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
<div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900 text-center space-y-4">
<button
onClick={() => setIsLoginPromptOpen(false)}
className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
>
✕
</button>
<div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
🔒
</div>
<div className="space-y-1">
<h3 className="text-lg font-bold text-slate-900">Authentication Required</h3>
<p className="text-xs text-slate-500">Please sign in or create an account to share your testimonial with the community.</p>
</div>
<div className="pt-2 flex flex-col gap-2.5">
<button
onClick={() => {
setIsLoginPromptOpen(false)
const allButtons = Array.from(document.querySelectorAll('button, a'))
const signUpBtn = allButtons.find(el => el.textContent?.toLowerCase().includes('get started') || el.textContent?.toLowerCase().includes('sign up'))
if (signUpBtn) {
(signUpBtn as HTMLElement).click()
} else {
router.push('/onboard')
}
}}
className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
>
Sign Up (Get Started)
</button>
</div>
</div>
</div>
)}
{/* Add / Edit Testimonial Modal Form */}
{isAddModalOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
<div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900">
<button
onClick={() => setIsAddModalOpen(false)}
className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
>
✕
</button>
<h3 className="text-2xl font-extrabold text-slate-900 mb-1">
{isEditing ? 'Edit Your Testimonial' : 'Share Your Experience'}
</h3>
<p className="text-xs text-slate-500 mb-6">
{isEditing ? 'Update your review for the Cveat community.' : 'Add your testimonial to the Cveat community.'}
</p>
{formError && (
<div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
{formError}
</div>
)}
<form onSubmit={handleAddTestimonialSubmit} className="space-y-4">
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div>
<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name *</label>
<input
type="text"
value={newTestimonial.name}
onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
placeholder="e.g. John Doe"
className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
/>
</div>
<div>
<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Profession *</label>
<input
type="text"
value={newTestimonial.profession}
onChange={(e) => setNewTestimonial({ ...newTestimonial, profession: e.target.value })}
placeholder="e.g. Developer"
className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
/>
</div>
</div>
<div>
<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Star Rating</label>
<div className="flex items-center gap-2 py-1">
{[1, 2, 3, 4, 5].map((star) => (
<button
key={star}
type="button"
onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}
className={`text-2xl transition-colors cursor-pointer ${star <= newTestimonial.rating ? 'text-amber-400' : 'text-slate-300'}`}
>
★
</button>
))}
<span className="ml-2 text-xs font-bold text-slate-600">({newTestimonial.rating} / 5)</span>
</div>
</div>
<div>
<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
Your Testimonial (<span className="text-indigo-600">Max 250 words</span>) *
</label>
<textarea
rows={4}
value={newTestimonial.text}
onChange={(e) => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
placeholder="How did Cveat help your job search or resume building?"
className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
/>
</div>
<div className="flex justify-end gap-3 pt-2">
<button
type="button"
onClick={() => setIsAddModalOpen(false)}
className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
>
Cancel
</button>
<button
type="submit"
className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
>
{isEditing ? 'Save Changes' : 'Publish Testimonial'}
</button>
</div>
</form>
</div>
</div>
)}
{/* SEO Optimized FAQ Section */}
<section className="mx-auto max-w-4xl px-6 py-20 border-t border-slate-100">
<div className="text-center space-y-4 mb-12">
<div className="mb-4 inline-block">
<span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
Got Questions
</span>
</div>
<h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
Frequently Asked Questions
</h2>
<p className="text-sm text-slate-600 max-w-lg mx-auto">
Everything you need to know about our resume builder, AI ATS checker, and credit plans.
</p>
</div>
<div className="space-y-4">
{faqs.map((faq, index) => {
const isOpen = openFaqIndex === index
return (
<div
key={index}
className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-600 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200/60"
>
<button
onClick={() => setOpenFaqIndex(isOpen ? null : index)}
className="w-full flex items-center justify-between p-6 text-left font-bold text-slate-900 transition-colors duration-300 group-hover:text-white cursor-pointer" aria-expanded={isOpen}
>
<span className="text-base">{faq.question}</span>
<span className={`transform transition-transform duration-300 text-indigo-600 group-hover:text-white font-bold text-lg ${isOpen ? 'rotate-45' : ''}`}>
+
</span>
</button>
{isOpen && (
<div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4 transition-colors duration-300 group-hover:border-white/25 group-hover:text-indigo-50">
{faq.answer}
</div>
)}
</div>
)
})}
</div>
</section>
{/* Blog Section with Dynamic Supabase Articles */}
<section id="blog" className="mx-auto max-w-6xl px-6 py-20 border-t border-slate-100">
<div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
<div className="text-center sm:text-left">
<h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Latest Career & ATS Insights</h2>
<p className="mt-2 text-sm text-slate-600">Expert tips to help you optimize your resume, beat automated screening bots, and ace interviews.</p>
</div>
<div className="flex items-center gap-3">
<Link href="/blog">
<button className="rounded-xl border border-indigo-200 bg-white px-6 py-3 text-xs font-semibold text-indigo-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-200 cursor-pointer whitespace-nowrap">
See More Blogs
</button>
</Link>
{isAdmin && (
<Link href="/admin/blog">
<button className="rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition-all cursor-pointer whitespace-nowrap">
Admin Dashboard
</button>
</Link>
)}
</div>
</div>
{/* Dynamic Latest 3 Blogs Grid */}
{latestBlogs.length === 0 ? (
<div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
<p className="text-sm font-bold text-slate-700">No blog posts published yet.</p>
<p className="text-xs text-slate-500 mt-1">Published articles will appear here automatically.</p>
</div>
) : (
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
{latestBlogs.map((blog) => (
<div key={blog.id} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/80">
<div>
<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 transition-colors duration-300 group-hover:border-indigo-200 group-hover:bg-indigo-100">
{blog.category}
</span>
<h3 className="text-base font-bold text-slate-900 mt-3 leading-snug transition-colors duration-300 group-hover:text-indigo-700">{blog.title}</h3>
<p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">{blog.excerpt}</p>
</div>
<div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
<span className="text-[11px] text-slate-400">{new Date(blog.created_at).toLocaleDateString()}</span>
<Link href={`/articles/${blog.slug}`}>
<span className="font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer inline-block transition-transform duration-300 group-hover:translate-x-1">Read Article </span>
</Link>
</div>
</div>
))}
</div>
)}
</section>
{/* Footer */}
<footer className="bg-slate-950 text-slate-400 py-16 px-6 border-t border-slate-800">
<div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
<div className="space-y-4 md:col-span-1">
<h3 className="text-xl font-black tracking-tight text-white">CVeat</h3>
<p className="text-xs text-slate-400 leading-relaxed">Empowering experienced professionals to bypass automated ATS filters and land interviews faster. CVeat provides a free ATS resume scanning and optimization tool designed for job seekers.</p>
</div>
<div className="space-y-3">
<h4 className="text-xs font-bold uppercase tracking-wider text-white">Navigation</h4>
<ul className="space-y-2 text-xs">
<li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
<li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
<li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
<li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
<li><Link href="/ats-checker" className="hover:text-white transition-colors">ATS Checker</Link></li>
<li><Link href="/interview-prep" className="hover:text-white transition-colors">Interview-Prep</Link></li>
</ul>
</div>
<div className="space-y-3">
<h4 className="text-xs font-bold uppercase tracking-wider text-white">Legal</h4>
<ul className="space-y-2 text-xs">
<li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
<li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
</ul>
</div>
<div className="space-y-3">
<h4 className="text-xs font-bold uppercase tracking-wider text-white">Support</h4>
<p className="text-xs text-slate-400">Need help? Reach out to our team.</p>
<Link href="/contact">
<button className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer">
Contact Support
</button>
</Link>
</div>
</div>
<div className="mx-auto max-w-6xl pt-8 border-t border-slate-900 text-xs text-slate-500">
<p>© 2026 CVeat. All rights reserved.</p>
</div>
</footer>
</div>
)
}

