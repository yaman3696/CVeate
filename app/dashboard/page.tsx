'use client'
import type { ReactNode } from 'react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
type Experience = { role: string; company: string; duration: string; bullets: string; startDate?: string; endDate?: string; current?: boolean }
type Qualification = { degree: string; institution: string; year: string; startDate?: string; endDate?: string; current?: boolean }
type Project = { name: string; role: string; technologies: string; link: string; startDate: string; endDate: string; current: boolean; description: string }
type Certification = { name: string; issuer: string; issueDate: string; credentialId: string; url: string }
const blankProject = (): Project => ({ name: '', role: '', technologies: '', link: '', startDate: '', endDate: '', current: false, description: '' })
const blankCertification = (): Certification => ({ name: '', issuer: '', issueDate: '', credentialId: '', url: '' })
type ResumeData = {
fullName: string; headline: string; email: string; phone: string; city: string; state: string;
pincode: string; linkedin: string; portfolio: string; portfolioLinks?: string[];
bio: string; experiences: Experience[]; qualifications: Qualification[]; projects: Project[]; certifications: Certification[];
technicalSkills: string | string[]; softSkills: string; hobbies: string; languages: string;
dateOfBirth?: string; includeDob?: boolean; accentColor?: string; skillGroups?: { name: string; skills: string }[];
[key: string]: unknown
}
const EMPTY: ResumeData = {
fullName: '', headline: '', email: '', phone: '', city: '', state: '', pincode: '',
linkedin: '', portfolio: '', bio: '', experiences: [], qualifications: [],
technicalSkills: '', softSkills: '', hobbies: '', languages: '', projects: [], certifications: [], dateOfBirth: '', includeDob: false, accentColor: 'indigo', skillGroups: [],
}
function asString(value: unknown): string { return typeof value === 'string' ? value : '' }
function plainText(value: unknown): string {
const raw = asString(value)
if (typeof document === 'undefined') return raw.replace(/<[^>]*>/g, ' ')
const element = document.createElement('div')
element.innerHTML = raw.replace(/<\/li\s*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p\s*>/gi, '\n')
element.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove())
return (element.textContent || '').replace(/\u00a0/g, ' ').trim()
}
const PALETTE: Record<string, { rgb: [number, number, number]; hex: string; label: string }> = {
indigo: { rgb: [67, 56, 202], hex: '#4338ca', label: 'Indigo' },
navy: { rgb: [30, 58, 95], hex: '#1e3a5f', label: 'Navy' },
teal: { rgb: [15, 118, 110], hex: '#0f766e', label: 'Teal' },
black: { rgb: [23, 23, 23], hex: '#171717', label: 'Classic B&W' },
}
const dateLabel = (date: string) => {
if (!/^\d{4}-\d{2}$/.test(date)) return date
const [year, month] = date.split('-').map(Number)
return `${new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' })} ${year}`
}
const expDates = (e: Experience) => e.startDate ? `${dateLabel(e.startDate)} – ${e.current ? 'Present' : e.endDate ? dateLabel(e.endDate) : 'Present'}` : e.duration
const eduDates = (q: Qualification) => q.startDate ? `${dateLabel(q.startDate)} – ${q.current ? 'Present' : q.endDate ? dateLabel(q.endDate) : q.year || 'Present'}` : q.year
const stripMarks = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^[-•]\s*/gm, '')
function normalize(value: unknown): ResumeData {
const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const links = Array.isArray(data.portfolioLinks) ? data.portfolioLinks.filter((x): x is string => typeof x === 'string') : []
return {
...EMPTY, ...data,
fullName: asString(data.fullName), headline: asString(data.headline), email: asString(data.email),
phone: asString(data.phone), city: asString(data.city), state: asString(data.state),
pincode: asString(data.pincode), linkedin: asString(data.linkedin),
portfolio: asString(data.portfolio) || links.filter(Boolean).join(', '),
portfolioLinks: links.length ? links : undefined,
bio: legacyToRich(asString(data.bio)),
experiences: Array.isArray(data.experiences) ? data.experiences.map((item: unknown) => {
const e = item && typeof item === 'object' ? item as Record<string, unknown> : {}
return { ...e, role: asString(e.role), company: asString(e.company), duration: asString(e.duration), bullets: legacyToRich(asString(e.bullets)) }
}) : [],
qualifications: Array.isArray(data.qualifications) ? data.qualifications.map((item: unknown) => {
const q = item && typeof item === 'object' ? item as Record<string, unknown> : {}
return { ...q, degree: asString(q.degree), institution: asString(q.institution), year: asString(q.year) }
}) : [],
projects: Array.isArray(data.projects) ? data.projects.map((x: unknown) => { const p = x && typeof x === 'object' ? x as Record<string, unknown> : {}; return { ...blankProject(), name: asString(p.name), role: asString(p.role), technologies: asString(p.technologies), link: asString(p.link), startDate: asString(p.startDate), endDate: asString(p.endDate), current: p.current === true, description: legacyToRich(asString(p.description)) } }) : [],
    certifications: Array.isArray(data.certifications) ? data.certifications.map((x: unknown) => { const c = x && typeof x === 'object' ? x as Record<string, unknown> : {}; return { ...blankCertification(), name: asString(c.name), issuer: asString(c.issuer), issueDate: asString(c.issueDate), credentialId: asString(c.credentialId), url: asString(c.url) } }) : [],
    technicalSkills: Array.isArray(data.technicalSkills) ? data.technicalSkills.filter((x): x is string => typeof x === 'string') : asString(data.technicalSkills),
softSkills: asString(data.softSkills), hobbies: asString(data.hobbies), languages: asString(data.languages),
dateOfBirth: asString(data.dateOfBirth), includeDob: data.includeDob === true,
accentColor: typeof data.accentColor === 'string' && PALETTE[data.accentColor] ? data.accentColor : 'indigo',
skillGroups: Array.isArray(data.skillGroups) ? data.skillGroups.map((g: unknown) => {
const group = g && typeof g === 'object' ? g as Record<string, unknown> : {}
return { name: asString(group.name), skills: asString(group.skills) }
}) : [],
}
}
function ungroupedSkills(data: ResumeData): string {
const raw = Array.isArray(data.technicalSkills) ? data.technicalSkills.join(', ') : (data.technicalSkills || '')
const categorized = new Set((data.skillGroups || []).flatMap(group => group.skills.split(',')).map(v => v.trim().toLowerCase()).filter(Boolean))
const seen = new Set<string>()
return raw.split(',').map(v => v.trim()).filter(v => {
const key = v.toLowerCase()
if (!key || categorized.has(key) || seen.has(key)) return false
seen.add(key)
return true
}).join(', ')
}
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
const labelClass = 'mb-1 block text-xs font-bold text-slate-600'
// Keep only a small, safe subset of formatting tags in saved resume content.
function safeRichHtml(raw: string): string {
if (typeof document === 'undefined') return raw
const template = document.createElement('template')
template.innerHTML = raw
const allowed = new Set(['P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I'])
const clean = (node: Node): void => {
for (const child of Array.from(node.childNodes)) {
if (child.nodeType === Node.COMMENT_NODE) { child.parentNode?.removeChild(child); continue }
if (child.nodeType !== Node.ELEMENT_NODE) continue
const el = child as HTMLElement
if (['SCRIPT', 'STYLE', 'IFRAME', 'SVG', 'OBJECT', 'EMBED', 'FORM'].includes(el.tagName)) { el.remove(); continue }
clean(el)
if (!allowed.has(el.tagName)) { el.replaceWith(...Array.from(el.childNodes)); continue }
for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name)
}
}
clean(template.content)
return template.innerHTML
}
function legacyToRich(raw: string): string {
if (!raw) return ''
// Normalize literal HTML space entities introduced by pasted rich text or earlier saves.
raw = raw.replace(/&(?:amp;)*nbsp;/gi, ' ').replace(/\u00a0/g, ' ')
if (/<(?:p|div|ul|ol|li|br|strong|b|em|i)\b/i.test(raw)) return safeRichHtml(raw)
const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const lines = raw.split(/\r?\n/)
const parts: string[] = []
let bullets: string[] = []
const flush = () => { if (bullets.length) { parts.push(`<ul>${bullets.join('')}</ul>`); bullets = [] } }
for (const rawLine of lines) {
const line = rawLine.trim()
const marked = escapeHtml(line.replace(/^[•-]\s*/, '')).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
if (/^[•-]\s/.test(line)) bullets.push(`<li>${marked}</li>`)
else { flush(); if (line) parts.push(`<p>${marked}</p>`) }
}
flush()
return parts.join('')
}
function RichPreview({ value }: { value: string }) {
return <div className="resume-rich text-xs leading-relaxed text-slate-700 [&_p]:mb-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1" dangerouslySetInnerHTML={{ __html: legacyToRich(value) }} />
}
function FormatIcon({ name }: { name: string }) {
const paths: Record<string, ReactNode> = {
bold: <><path d="M6 4h6a4 4 0 0 1 0 8H6z"/><path d="M6 12h7a4 4 0 0 1 0 8H6z"/></>,
italic: <><path d="M13 4h7M4 20h7M15 4 9 20"/></>,
bullets: <><path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3"/></>,
numbers: <><path d="M10 6h11M10 12h11M10 18h11M3 5l2-1v5M3 13c0-2 4-2 4 0 0 1-4 3-4 4h4"/></>,
undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></>,
redo: <><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h2"/></>,
}
return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
function FormatEditor({ value, onChange, rows = 5 }: { value: string; onChange: (v: string) => void; rows?: number }) {
const ref = useRef<HTMLDivElement>(null)
const currentValue = useRef(value)
useEffect(() => {
const el = ref.current
if (!el) return
const html = legacyToRich(value)
if (value !== currentValue.current || !el.innerHTML) el.innerHTML = html
currentValue.current = value
}, [value])
const apply = (command: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList' | 'undo' | 'redo') => {
ref.current?.focus()
document.execCommand(command, false)
const next = safeRichHtml(ref.current?.innerHTML || '')
currentValue.current = next
onChange(next)
}
const actions: { command: Parameters<typeof apply>[0]; title: string; icon: string }[] = [
{ command: 'bold', icon: 'bold', title: 'Bold / unbold selected text (Ctrl/Cmd+B)' },
{ command: 'italic', icon: 'italic', title: 'Italic / remove italic (Ctrl/Cmd+I)' },
{ command: 'insertUnorderedList', icon: 'bullets', title: 'Toggle bullet list' },
{ command: 'insertOrderedList', icon: 'numbers', title: 'Toggle numbered list' },
{ command: 'undo', icon: 'undo', title: 'Undo' },
{ command: 'redo', icon: 'redo', title: 'Redo' },
]
return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-100">
<div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 p-2" role="toolbar" aria-label="Text formatting">
{actions.map(action => <button key={action.command} type="button" onMouseDown={e => e.preventDefault()} onClick={() => apply(action.command)} className="rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-100" title={action.title}><FormatIcon name={action.icon} /></button>)}
</div>
<div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-label="Formatted resume text" aria-multiline="true"
onInput={e => { const next = safeRichHtml(e.currentTarget.innerHTML); currentValue.current = next; onChange(next) }}
className="min-h-[120px] px-3 py-3 text-sm text-slate-800 outline-none [&_p]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
style={{ minHeight: rows * 23 }} />
<p className="px-3 pb-2 text-[10px] text-slate-400">Select text to format. Click List again to unlist. Press Enter to add paragraphs.</p>
</div>
}
function DashboardContent() {
const searchParams = useSearchParams()
const [cvData, setCvData] = useState<ResumeData>(EMPTY)
const [loaded, setLoaded] = useState(false)
const [userId, setUserId] = useState<string | null>(null)
const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
const [savingHistory, setSavingHistory] = useState(false)
const [downloading, setDownloading] = useState(false)
const [message, setMessage] = useState('')
const [active, setActive] = useState('personal')
const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
const [cvTitle, setCvTitle] = useState('My Resume')
const accent = PALETTE[cvData.accentColor || 'indigo'] || PALETTE.indigo
const latestRef = useRef(cvData)
const initialDownloadRef = useRef(false)
const storageKey = userId ? `cveate_resume_data_${userId}` : 'cveate_resume_data_guest'
const profileKey = userId ? `cveate_profile_${userId}` : 'cveate_profile'
const update = useCallback((patch: Partial<ResumeData>) => {
setCvData(previous => ({ ...previous, ...patch }))
setSaveState('saving')
}, [])
useEffect(() => { latestRef.current = cvData }, [cvData])
useEffect(() => {
let cancelled = false
async function load() {
try {
const { data: { session } } = await supabase.auth.getSession()
if (cancelled) return
const id = session?.user?.id ?? null
setUserId(id)
const keys = id ? [`cveate_resume_data_${id}`, `cveate_profile_${id}`] : ['cveate_resume_data_guest', 'cveate_profile']
for (const key of keys) {
const raw = sessionStorage.getItem(key) || localStorage.getItem(key)
if (!raw) continue
try {
const parsed = normalize(JSON.parse(raw))
if (!cancelled) { setCvData(parsed); latestRef.current = parsed; setLoaded(true) }
return
} catch (error) { console.error('Unable to read saved resume:', error) }
}
if (id) {
const { data, error } = await supabase.from('cv_history').select('cv_data').eq('user_id', id).eq('is_primary', true).maybeSingle()
if (error) console.error('Unable to load primary resume:', error)
if (data?.cv_data && !cancelled) {
const parsed = normalize(data.cv_data)
setCvData(parsed); latestRef.current = parsed
}
}
} catch (error) { console.error('Resume load error:', error) }
finally { if (!cancelled) setLoaded(true) }
}
load()
return () => { cancelled = true }
}, [])
useEffect(() => {
if (!loaded) return
setSaveState('saving')
const timer = window.setTimeout(() => {
try {
const payload: ResumeData = {
...cvData,
portfolio: cvData.portfolioLinks?.filter(Boolean).join(', ') || cvData.portfolio,
}
sessionStorage.setItem(storageKey, JSON.stringify(payload))
localStorage.setItem(profileKey, JSON.stringify(payload))
setSaveState('saved')
} catch (error) { console.error('Autosave failed:', error); setSaveState('error') }
}, 450)
return () => window.clearTimeout(timer)
}, [cvData, loaded, storageKey, profileKey])
const downloadPDF = useCallback(async (data: ResumeData) => {
const { jsPDF } = await import('jspdf')
const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
const left = 17, right = 17, width = 210 - left - right, bottom = 278
const accentRgb = (PALETTE[data.accentColor || 'indigo'] || PALETTE.indigo).rgb
let y = 20
const ensure = (height: number) => { if (y + height > bottom) { doc.addPage(); y = 19 } }
const line = (text: string, size = 9, bold = false, color: [number, number, number] = [51, 65, 85], gap = 2.5, center = false) => {
if (!text.trim()) return
doc.setFont('helvetica', bold ? 'bold' : 'normal')
doc.setFontSize(size); doc.setTextColor(...color)
const lines = doc.splitTextToSize(text, width) as string[]
const step = size * 0.42
ensure(lines.length * step + gap)
doc.text(lines, center ? 105 : left, y, { align: center ? 'center' : 'left', lineHeightFactor: 1.15 })
y += lines.length * step + gap
}
const rich = (html: string, size = 9) => {
const holder = document.createElement('div')
holder.innerHTML = legacyToRich(html)
type Span = { text: string; bold: boolean; italic: boolean }
const blocks: { runs: Span[]; bullet: string }[] = []
const walk = (node: Node, runs: Span[], bold = false, italic = false): void => {
if (node.nodeType === Node.TEXT_NODE) { runs.push({ text: (node.textContent || '').replace(/&(?:amp;)*nbsp;/gi, ' ').replace(/\u00a0/g, ' '), bold, italic }); return }
if (node.nodeType !== Node.ELEMENT_NODE) return
const el = node as HTMLElement
for (const child of Array.from(el.childNodes)) walk(child, runs, bold || ['STRONG','B'].includes(el.tagName), italic || ['EM','I'].includes(el.tagName))
}
const visit = (node: Node, marker = ''): void => {
if (node.nodeType !== Node.ELEMENT_NODE) return
const el = node as HTMLElement
if (['UL','OL'].includes(el.tagName)) {
Array.from(el.children).forEach((child, i) => visit(child, el.tagName === 'OL' ? `${i+1}. ` : '• '))
} else if (['P','DIV','LI'].includes(el.tagName)) {
const runs: Span[] = []; walk(el, runs); blocks.push({ runs, bullet: marker })
} else { const runs: Span[] = []; walk(el, runs); if (runs.length) blocks.push({ runs, bullet: marker }) }
}
Array.from(holder.childNodes).forEach(node => {
if (node.nodeType === Node.TEXT_NODE) blocks.push({ runs: [{text: (node.textContent || '').replace(/&(?:amp;)*nbsp;/gi, ' ').replace(/\u00a0/g, ' '), bold:false, italic:false}], bullet:'' })
else visit(node)
})
doc.setFontSize(size)
const step = size * 0.45
for (const block of blocks) {
let x = left
const tokens: Span[] = []
if (block.bullet) tokens.push({ text: block.bullet, bold: false, italic: false })
for (const run of block.runs) for (const token of run.text.split(/(\s+)/)) if (token) tokens.push({ ...run, text: token })
ensure(step + 2)
for (const token of tokens) {
doc.setFont('helvetica', token.bold ? (token.italic ? 'bolditalic' : 'bold') : (token.italic ? 'italic' : 'normal'))
doc.setFontSize(size)
doc.setTextColor(51,65,85)
const segments = token.text.match(/.{1,80}/g) || []
for (const segment of segments) {
const w = doc.getTextWidth(segment)
if (x > left && x + w > left + width && segment.trim()) { y += step; ensure(step + 1); x = left }
if (segment.trim()) doc.text(segment, x, y)
x += w
}
}
y += step + 2
}
}
const heading = (name: string) => {
ensure(14)
y += 2
doc.setDrawColor(226, 232, 240); doc.line(left, y, 210 - right, y); y += 5
line(name.toUpperCase(), 10, true, accentRgb, 3)
}
const safeUrl = (value: string) => {
const trimmed = value.trim()
if (!trimmed) return ''
const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
try { const url = new URL(candidate); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
const link = (value: string, alignment: 'center' | 'left' = 'center') => {
const url = safeUrl(value)
if (!url) return
doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
const lines = doc.splitTextToSize(value, width) as string[]
for (const text of lines) {
ensure(5)
doc.setTextColor(...accentRgb)
doc.textWithLink(text, alignment === 'center' ? 105 : left, y, { url, align: alignment })
y += 4.2
}
y += 1
}
line(data.fullName || 'Your Name', 20, true, [15, 23, 42], 2, true)
line(data.headline, 11, true, accentRgb, 3, true)
line([[data.city, data.state, data.pincode].filter(Boolean).join(', '), data.phone, data.email].filter(Boolean).join(' | '), 8.5, false, [71, 85, 105], 2, true)
if (data.includeDob && data.dateOfBirth) line(`DOB: ${new Date(data.dateOfBirth + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 8, false, [71, 85, 105], 2, true)
if (data.linkedin) link(data.linkedin)
const portfolio = data.portfolioLinks?.filter(Boolean) || data.portfolio.split(',').map(s => s.trim()).filter(Boolean)
portfolio.forEach(value => link(value))
if (data.bio.trim()) { heading('Professional Summary'); rich(data.bio) }
const experiences = data.experiences.filter(e => e.role || e.company || e.bullets)
if (experiences.length) {
heading('Professional Experience')
experiences.forEach(e => {
ensure(14)
line([e.role, e.company].filter(Boolean).join(' — '), 10, true, [15, 23, 42], 1)
line(expDates(e), 8.5, false, [100, 116, 139], 2)
rich(e.bullets)
y += 2
})
}
const qualifications = data.qualifications.filter(q => q.degree || q.institution)
if (qualifications.length) {
heading('Education & Qualifications')
qualifications.forEach(q => {
ensure(12)
line([q.degree, q.institution].filter(Boolean).join(' — '), 9.5, true, [15, 23, 42], 1)
line(eduDates(q), 8.5, false, [100, 116, 139], 2)
})
}
const projects = data.projects.filter(p => p.name.trim())
    if (projects.length) {
      heading('Projects')
      projects.forEach(p => {
        ensure(14)
        line([p.name, p.role].filter(Boolean).join(' — '), 10, true, [15, 23, 42], 1)
        if (p.startDate) line(`${dateLabel(p.startDate)} – ${p.current ? 'Present' : p.endDate ? dateLabel(p.endDate) : 'Present'}`, 8.5, false, [100, 116, 139], 1)
        if (p.technologies) line(`Tools: ${p.technologies}`, 8.5, false, [71, 85, 105], 1)
        if (p.link) link(p.link, 'left')
        if (p.description) rich(p.description)
        y += 2
      })
    }
    const certifications = data.certifications.filter(c => c.name.trim())
    if (certifications.length) {
      heading('Certifications & Training')
      certifications.forEach(c => {
        ensure(12)
        line([c.name, c.issuer].filter(Boolean).join(' — '), 9.5, true, [15, 23, 42], 1)
        if (c.issueDate) line(dateLabel(c.issueDate), 8.5, false, [100, 116, 139], 1)
        if (c.credentialId) line(`Credential ID: ${c.credentialId}`, 8.5, false, [71, 85, 105], 1)
        if (c.url) link(c.url, 'left')
      })
    }
    const skills = ungroupedSkills(data)
const extras = [ ...((data.skillGroups || []).filter(g => g.name.trim() && g.skills.trim()).map(g => [g.name, g.skills])), ['Additional Skills', skills], ['Soft Skills', data.softSkills], ['Languages', data.languages], ['Hobbies & Interests', data.hobbies] ].filter(([, value]) => value.trim())
if (extras.length) {
heading('Skills & Additional Information')
// Render labels in bold while allowing long skill values to wrap cleanly.
extras.forEach(([name, value]) => {
const label = `${name}: `
const fontSize = 9
const step = fontSize * 0.45
doc.setFontSize(fontSize)
doc.setTextColor(51, 65, 85)
doc.setFont('helvetica', 'bold')
const labelWidth = doc.getTextWidth(label)
doc.setFont('helvetica', 'normal')
const words = value.trim().split(/\s+/)
let firstLine = true
let remaining = words
while (remaining.length) {
const availableWidth = firstLine ? width - labelWidth : width
let lineValue = ''
while (remaining.length) {
const candidate = lineValue ? `${lineValue} ${remaining[0]}` : remaining[0]
if (lineValue && doc.getTextWidth(candidate) > availableWidth) break
lineValue = candidate
remaining = remaining.slice(1)
}
ensure(step + 1)
if (firstLine) {
doc.setFont('helvetica', 'bold')
doc.text(label, left, y)
doc.setFont('helvetica', 'normal')
if (lineValue) doc.text(lineValue, left + labelWidth, y)
} else {
doc.setFont('helvetica', 'normal')
doc.text(lineValue, left, y)
}
y += step
firstLine = false
}
y += 2
})
}
const filename = (data.fullName.trim() || 'My_Resume').replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '_') || 'My_Resume'
doc.save(`${filename}_CV.pdf`)
}, [])
useEffect(() => {
if (!loaded || searchParams.get('download') !== 'true' || initialDownloadRef.current) return
initialDownloadRef.current = true
void downloadPDF(latestRef.current).catch(error => { console.error(error); setMessage('PDF download failed. Please try again.') })
}, [loaded, searchParams, downloadPDF])
const handleDownload = async () => {
setDownloading(true); setMessage('')
try { await downloadPDF(cvData) }
catch (error) { console.error(error); setMessage('PDF download failed. Please try again.') }
finally { setDownloading(false) }
}
const handleSaveToHistory = async () => {
if (savingHistory) return
setMessage(''); setSavingHistory(true)
try {
const { data: { session } } = await supabase.auth.getSession()
if (!session) { setMessage('Please sign in to save a CV version to history. Your draft is still saved on this device.'); return }
const { data: profile } = await supabase.from('profiles').select('plan_name').eq('id', session.user.id).single()
const plan = (profile?.plan_name || 'Freemium').toLowerCase()
const limit = plan.includes('monthly') ? 100 : plan.includes('daily') ? 10 : 2
const { count, error: countError } = await supabase.from('cv_history').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id)
if (countError) throw countError
if ((count ?? 0) >= limit) { setMessage(`Your ${profile?.plan_name || 'Freemium'} plan allows ${limit} saved CVs. Your draft remains saved locally.`); return }
const { error } = await supabase.from('cv_history').insert([{
user_id: session.user.id, cv_title: cvTitle.trim() || `${cvData.fullName || 'Professional'} Resume`,
match_score: null, is_primary: count === 0, cv_data: cvData,
}])
if (error) throw error
setMessage('CV version saved to history.')
} catch (error: unknown) {
console.error(error)
setMessage(error instanceof Error ? error.message : 'Could not save to history.')
} finally { setSavingHistory(false) }
}
const setExperience = (index: number, field: keyof Experience, value: string) => {
update({ experiences: cvData.experiences.map((item, i) => i === index ? { ...item, [field]: value } : item) })
}
const setQualification = (index: number, field: keyof Qualification, value: string) => {
update({ qualifications: cvData.qualifications.map((item, i) => i === index ? { ...item, [field]: value } : item) })
}
const field = (label: string, key: keyof ResumeData, placeholder = '') => (
<label className="block"><span className={labelClass}>{label}</span>
<input className={inputClass} value={asString(cvData[key])} placeholder={placeholder}
inputMode={key === 'pincode' || key === 'phone' ? 'numeric' : undefined}
maxLength={key === 'pincode' ? 6 : undefined}
onChange={e => update({ [key]: key === 'pincode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : key === 'phone' ? e.target.value.replace(/[^+\d]/g, '').replace(/(?!^)\+/g, '') : e.target.value })} />
</label>
)
const sections = [
['personal', 'Personal details'], ['summary', 'Professional summary'], ['experience', 'Work experience'],
['education', 'Education'], ['projects', 'Projects'], ['certifications', 'Certifications'], ['skills', 'Skills & extras'],
] as const
const skills = ungroupedSkills(cvData)
const portfolioValue = cvData.portfolioLinks?.filter(Boolean).join(', ') || cvData.portfolio
const contact = [[cvData.city, cvData.state, cvData.pincode].filter(Boolean).join(', '), cvData.phone, cvData.email].filter(Boolean)
return (
<main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 sm:px-6 lg:py-8">
<div className="mx-auto max-w-[1500px] space-y-5">
<header className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-600">CVeate Resume Workspace</p>
<h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Make your next CV your best.</h1>
<p className="mt-1 text-xs text-slate-500">Edit on the left, preview on the right, and download whenever you're ready.</p>
<p className={`mt-2 text-xs font-semibold ${saveState === 'error' ? 'text-red-600' : 'text-emerald-700'}`} aria-live="polite">
{loaded ? saveState === 'saving' ? 'Saving draft…' : saveState === 'error' ? 'Could not save draft on this device' : '✓ Draft saved on this device' : 'Loading your resume…'}
</p>
</div>
<div className="flex flex-wrap items-center gap-2">
<button type="button" onClick={handleSaveToHistory} disabled={!loaded || savingHistory}
className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50">
{savingHistory ? 'Saving…' : 'Save to History'}
</button>
<button type="button" onClick={handleDownload} disabled={!loaded || downloading}
className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">
{downloading ? 'Preparing PDF…' : '↓ Download PDF'}
</button>
</div>
</header>
{message && <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">{message}</div>}
<div className="flex gap-2 rounded-xl bg-white p-1 shadow-sm lg:hidden">
<button type="button" onClick={() => setMobileTab('edit')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mobileTab === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Edit CV</button>
<button type="button" onClick={() => setMobileTab('preview')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mobileTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Preview CV</button>
</div>
<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
<section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${mobileTab === 'preview' ? 'hidden lg:block' : ''}`} aria-label="Resume editor">
<div className="border-b border-slate-100 p-5">
<h2 className="text-lg font-extrabold">Edit your resume</h2>
<p className="mt-1 text-xs text-slate-500">Choose a section to update. Changes appear instantly in the preview.</p>
</div>
<nav className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-3" aria-label="Resume sections">
{sections.map(([id, title]) => <button key={id} type="button" onClick={() => setActive(id)}
className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition ${active === id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}>{title}</button>)}
</nav>
<div className="max-h-[calc(100vh-260px)] min-h-[380px] space-y-4 overflow-y-auto p-5 sm:p-6">
{active === 'personal' && <div className="space-y-4">
<h3 className="text-sm font-extrabold text-indigo-700">Personal information</h3>
{field('Full name', 'fullName', 'Your full name')}
{field('Professional headline', 'headline', 'e.g. Product Designer')}
<div className="grid gap-3 sm:grid-cols-2">{field('Email address', 'email')}{field('Phone number', 'phone')}</div>
<div className="grid gap-3 sm:grid-cols-3">{field('City', 'city')}{field('State', 'state')}{field('Pincode', 'pincode')}</div>
<label className="block"><span className={labelClass}>Date of birth (optional)</span><input type="date" className={inputClass} value={cvData.dateOfBirth || ''} onChange={e => update({ dateOfBirth: e.target.value })} /></label>
<label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={cvData.includeDob || false} onChange={e => update({ includeDob: e.target.checked })} /> Include date of birth in PDF (usually not recommended)</label>
{field('LinkedIn', 'linkedin', 'linkedin.com/in/yourname')}
<label className="block"><span className={labelClass}>Portfolio links (separate with commas)</span>
<input className={inputClass} value={portfolioValue} onChange={e => update({ portfolio: e.target.value, portfolioLinks: undefined })} placeholder="github.com/you, behance.net/you" />
</label>
</div>}
{active === 'summary' && <div className="space-y-3">
<h3 className="text-sm font-extrabold text-indigo-700">Professional summary</h3>
<p className="text-xs leading-relaxed text-slate-500">Highlight your experience, relevant strengths and measurable results. Use only skills you actually have.</p>
<FormatEditor rows={7} value={cvData.bio} onChange={value => update({ bio: value })} />
</div>}
{active === 'experience' && <div className="space-y-4">
<h3 className="text-sm font-extrabold text-indigo-700">Work experience</h3>
<p className="text-xs text-slate-500">Choose month and year for employment dates. Older saved duration values are preserved until you select new dates.</p>
{cvData.experiences.map((exp, index) => <div key={index} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
<div className="flex items-center justify-between"><strong className="text-xs text-indigo-700">Experience {index + 1}</strong>
<button type="button" onClick={() => update({ experiences: cvData.experiences.filter((_, i) => i !== index) })} className="text-xs font-bold text-red-600 hover:underline">Remove</button></div>
<div className="grid gap-3 sm:grid-cols-2">
<label><span className={labelClass}>Job title</span><input className={inputClass} value={exp.role} onChange={e => setExperience(index, 'role', e.target.value)} /></label>
<label><span className={labelClass}>Company</span><input className={inputClass} value={exp.company} onChange={e => setExperience(index, 'company', e.target.value)} /></label>
</div>
<div className="grid gap-3 sm:grid-cols-2">
<label><span className={labelClass}>Start month / year</span><input type="month" className={inputClass} value={exp.startDate || ''} onChange={e => setExperience(index, 'startDate', e.target.value)} /></label>
<label><span className={labelClass}>End month / year</span><input type="month" className={inputClass} disabled={!!exp.current} min={exp.startDate || undefined} value={exp.endDate || ''} onChange={e => setExperience(index, 'endDate', e.target.value)} /></label>
</div>
<label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={!!exp.current} onChange={e => update({ experiences: cvData.experiences.map((item, i) => i === index ? { ...item, current: e.target.checked, endDate: e.target.checked ? '' : item.endDate } : item) })} /> Currently working here</label>
{!exp.startDate && <label className="block"><span className={labelClass}>Existing duration (legacy data)</span><input className={inputClass} value={exp.duration} onChange={e => setExperience(index, 'duration', e.target.value)} placeholder="Jan 2023 – Present" /></label>}
<label className="block"><span className={labelClass}>Achievements (one per line)</span><FormatEditor value={exp.bullets} onChange={value => setExperience(index, 'bullets', value)} /></label>
</div>)}
<button type="button" onClick={() => update({ experiences: [...cvData.experiences, { role: '', company: '', duration: '', bullets: '' }] })}
className="w-full rounded-xl border-2 border-dashed border-indigo-200 px-4 py-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50">+ Add work experience</button>
</div>}
{active === 'education' && <div className="space-y-4">
<h3 className="text-sm font-extrabold text-indigo-700">Education & qualifications</h3>
{cvData.qualifications.map((q, index) => <div key={index} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
<div className="flex items-center justify-between"><strong className="text-xs text-indigo-700">Qualification {index + 1}</strong>
<button type="button" onClick={() => update({ qualifications: cvData.qualifications.filter((_, i) => i !== index) })} className="text-xs font-bold text-red-600 hover:underline">Remove</button></div>
<label className="block"><span className={labelClass}>Degree / certification</span><input className={inputClass} value={q.degree} onChange={e => setQualification(index, 'degree', e.target.value)} /></label>
<label className="block"><span className={labelClass}>Institution</span><input className={inputClass} value={q.institution} onChange={e => setQualification(index, 'institution', e.target.value)} /></label>
<div className="grid gap-3 sm:grid-cols-2">
<label><span className={labelClass}>Start month / year</span><input type="month" className={inputClass} value={q.startDate || ''} onChange={e => setQualification(index, 'startDate', e.target.value)} /></label>
<label><span className={labelClass}>End month / year</span><input type="month" className={inputClass} min={q.startDate || undefined} disabled={!!q.current} value={q.endDate || ''} onChange={e => setQualification(index, 'endDate', e.target.value)} /></label>
</div>
<label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={!!q.current} onChange={e => update({ qualifications: cvData.qualifications.map((item, i) => i === index ? { ...item, current: e.target.checked, endDate: e.target.checked ? '' : item.endDate } : item) })} /> Currently studying</label>
{!q.startDate && <label className="block"><span className={labelClass}>Existing passing year (legacy data)</span><input inputMode="numeric" maxLength={4} className={inputClass} value={q.year} onChange={e => setQualification(index, 'year', e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>}
</div>)}
<button type="button" onClick={() => update({ qualifications: [...cvData.qualifications, { degree: '', institution: '', year: '' }] })}
className="w-full rounded-xl border-2 border-dashed border-indigo-200 px-4 py-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50">+ Add qualification</button>
</div>}
{active === 'projects' && <div className="space-y-4">
<h3 className="text-sm font-extrabold text-indigo-700">Projects (optional)</h3><p className="text-xs text-slate-500">Show academic, personal, freelance or professional work. Useful for freshers and experienced candidates.</p>
{cvData.projects.map((p, i) => <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
<div className="flex justify-between"><strong className="text-xs text-indigo-700">Project {i + 1}</strong><button type="button" className="text-xs font-bold text-red-600" onClick={() => update({ projects: cvData.projects.filter((_, n) => n !== i) })}>Remove</button></div>
<div className="grid gap-3 sm:grid-cols-2">{([['Project name','name'], ['Your role','role'], ['Tools / technologies','technologies'], ['Project link','link']] as const).map(([title, key]) => <label key={key}><span className={labelClass}>{title}</span><input className={inputClass} value={p[key]} onChange={e => update({ projects: cvData.projects.map((x,n) => n === i ? {...x, [key]: e.target.value} : x) })} /></label>)}<label><span className={labelClass}>Start month</span><input type="month" className={inputClass} value={p.startDate} onChange={e => update({ projects: cvData.projects.map((x,n) => n === i ? {...x, startDate: e.target.value} : x) })} /></label><label><span className={labelClass}>End month</span><input type="month" className={inputClass} min={p.startDate || undefined} disabled={p.current} value={p.endDate} onChange={e => update({ projects: cvData.projects.map((x,n) => n === i ? {...x, endDate: e.target.value} : x) })} /></label></div>
<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={p.current} onChange={e => update({ projects: cvData.projects.map((x,n) => n === i ? {...x, current: e.target.checked, endDate: e.target.checked ? '' : x.endDate} : x) })} />Ongoing project</label>
<div><span className={labelClass}>Project contribution / outcome</span><FormatEditor value={p.description} onChange={description => update({ projects: cvData.projects.map((x,n) => n === i ? {...x, description} : x) })} /></div>
</div>)}
<button type="button" className="w-full rounded-xl border-2 border-dashed border-indigo-200 px-4 py-3 text-xs font-bold text-indigo-700" onClick={() => update({ projects: [...cvData.projects, blankProject()] })}>+ Add project</button>
</div>}
{active === 'certifications' && <div className="space-y-4">
<h3 className="text-sm font-extrabold text-indigo-700">Certifications & training (optional)</h3>
{cvData.certifications.map((c, i) => <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex justify-between"><strong className="text-xs text-indigo-700">Certification {i + 1}</strong><button type="button" className="text-xs font-bold text-red-600" onClick={() => update({ certifications: cvData.certifications.filter((_, n) => n !== i) })}>Remove</button></div><div className="grid gap-3 sm:grid-cols-2">{([['Certification / course name','name'],['Issuer','issuer'],['Credential ID','credentialId'],['Credential URL','url']] as const).map(([title,key]) => <label key={key}><span className={labelClass}>{title}</span><input className={inputClass} value={c[key]} onChange={e => update({ certifications: cvData.certifications.map((x,n) => n === i ? {...x, [key]: e.target.value} : x) })} /></label>)}<label><span className={labelClass}>Issued month</span><input type="month" className={inputClass} value={c.issueDate} onChange={e => update({ certifications: cvData.certifications.map((x,n) => n === i ? {...x, issueDate: e.target.value} : x) })} /></label></div></div>)}
<button type="button" className="w-full rounded-xl border-2 border-dashed border-indigo-200 px-4 py-3 text-xs font-bold text-indigo-700" onClick={() => update({ certifications: [...cvData.certifications, blankCertification()] })}>+ Add certification</button>
</div>}
{active === 'skills' && <div className="space-y-4">
<h3 className="text-sm font-extrabold text-indigo-700">Skills & Expertise</h3>
<p className="text-xs leading-5 text-slate-500">Start with a simple list of skills. If you want a more organized resume, add optional categories below. No need to enter a skill twice.</p>
<label className="block"><span className={labelClass}>Quick add skills</span>
<textarea rows={3} className={inputClass} placeholder="e.g. Figma, Photoshop, Wireframing, Brand Identity" value={Array.isArray(cvData.technicalSkills) ? cvData.technicalSkills.join(', ') : cvData.technicalSkills} onChange={e => update({ technicalSkills: e.target.value })} />
<span className="mt-1 block text-[11px] text-slate-500">Separate skills with commas. Existing skills are preserved.</span>
</label>
<details className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
<summary className="cursor-pointer text-xs font-extrabold text-indigo-800">Organize skills by category <span className="font-normal text-slate-500">(optional)</span></summary>
<p className="mt-2 text-[11px] leading-5 text-slate-500">Examples: Design Tools, UI/UX, Programming, Finance, Marketing. Category names and skills appear together in your resume. Your existing groups are kept.</p>
<div className="mt-3 space-y-3">
{(cvData.skillGroups || []).map((g, i) => <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
<label className="block"><span className={labelClass}>Category name</span><input className={inputClass} placeholder="e.g. Design Software" value={g.name} onChange={e => update({ skillGroups: (cvData.skillGroups || []).map((x, j) => i === j ? { ...x, name: e.target.value } : x) })} /></label>
<label className="block"><span className={labelClass}>Skills in this category</span><textarea className={inputClass} rows={2} placeholder="Photoshop, Illustrator, Figma" value={g.skills} onChange={e => update({ skillGroups: (cvData.skillGroups || []).map((x, j) => i === j ? { ...x, skills: e.target.value } : x) })} /></label>
<button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => update({ skillGroups: (cvData.skillGroups || []).filter((_, j) => j !== i) })}>Remove category</button>
</div>)}
<button type="button" className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50" onClick={() => update({ skillGroups: [...(cvData.skillGroups || []), { name: '', skills: '' }] })}>+ Add a skill category</button>
</div>
</details>
{field('Soft skills', 'softSkills')}{field('Languages', 'languages')}{field('Hobbies & interests', 'hobbies')}
<label className="block"><span className={labelClass}>CV version title (for history)</span><input className={inputClass} value={cvTitle} onChange={e => setCvTitle(e.target.value)} /></label>
</div>}
</div>
</section>
<section className={`rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm sm:p-5 ${mobileTab === 'edit' ? 'hidden lg:block' : ''}`} aria-label="Live resume preview">
<div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-slate-800">Live CV preview</h2><div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><span>Accent color</span><select aria-label="Resume accent color" className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs lg:hidden" value={cvData.accentColor || 'indigo'} onChange={e => update({ accentColor: e.target.value })}>{Object.entries(PALETTE).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><div className="hidden flex-wrap items-center gap-2 lg:flex" role="radiogroup" aria-label="Resume accent color">{Object.entries(PALETTE).map(([key, option]) => <label key={key} className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 ${cvData.accentColor === key ? 'border-indigo-400 bg-white shadow-sm' : 'border-transparent hover:bg-white/70'}`}><input type="radio" name="resume-accent" value={key} checked={(cvData.accentColor || 'indigo') === key} onChange={() => update({ accentColor: key })} className="accent-indigo-600" /><span className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: option.hex }} /><span>{option.label}</span></label>)}</div></div></div>
<div className="mx-auto min-h-[650px] w-full max-w-[760px] space-y-5 bg-white px-5 py-8 text-slate-800 shadow-md sm:px-10 sm:py-11">
<div className="border-b border-slate-200 pb-5 text-center">
<h2 className="break-words text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{cvData.fullName || 'Your Name'}</h2>
<p className="mt-1 text-sm font-bold" style={{ color: accent.hex }}>{cvData.headline || 'Professional Headline'}</p>
<div className="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[11px] text-slate-600">{contact.map((value, i) => <span key={i}>{i > 0 ? '• ' : ''}{value}</span>)}</div>
{cvData.includeDob && cvData.dateOfBirth && <p className="mt-1 text-[11px] text-slate-600">DOB: {new Date(cvData.dateOfBirth + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
{cvData.linkedin && <p className="mt-1 break-all text-[11px]" style={{ color: accent.hex }}>{cvData.linkedin}</p>}
{portfolioValue && <p className="mt-1 break-all text-[11px]" style={{ color: accent.hex }}>{portfolioValue}</p>}
</div>
{cvData.bio && <div><h3 className="mb-2 border-b pb-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: accent.hex, borderColor: accent.hex + "33" }}>Professional Summary</h3><RichPreview value={cvData.bio} /></div>}
{cvData.experiences.some(e => e.role || e.company || e.bullets) && <div><h3 className="mb-3 border-b pb-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: accent.hex, borderColor: accent.hex + "33" }}>Professional Experience</h3>
<div className="space-y-4">{cvData.experiences.filter(e => e.role || e.company || e.bullets).map((exp, i) => <div key={i}>
<p className="text-sm font-bold text-slate-900">{[exp.role, exp.company].filter(Boolean).join(' — ')}</p>
{expDates(exp) && <p className="mt-0.5 text-[11px] text-slate-500">{expDates(exp)}</p>}
<div className="mt-1"><RichPreview value={exp.bullets} /></div>
</div>)}</div></div>}
{cvData.qualifications.some(q => q.degree || q.institution) && <div><h3 className="mb-3 border-b pb-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: accent.hex, borderColor: accent.hex + "33" }}>Education & Qualifications</h3>
<div className="space-y-3">{cvData.qualifications.filter(q => q.degree || q.institution).map((q, i) => <div key={i}>
<p className="text-sm font-bold text-slate-900">{q.degree}</p><p className="text-xs text-slate-700">{q.institution}</p><p className="text-[11px] text-slate-500">{eduDates(q)}</p>
</div>)}</div></div>}

{cvData.projects.some(p => p.name.trim()) && <div><h3 className="mb-3 border-b pb-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: accent.hex, borderColor: accent.hex + '33' }}>Projects</h3><div className="space-y-3">{cvData.projects.filter(p => p.name.trim()).map((p,i) => <div key={i}><p className="text-sm font-bold text-slate-900">{[p.name, p.role].filter(Boolean).join(' — ')}</p>{p.startDate && <p className="text-[11px] text-slate-500">{dateLabel(p.startDate)} – {p.current ? 'Present' : p.endDate ? dateLabel(p.endDate) : 'Present'}</p>}{p.technologies && <p className="text-xs text-slate-700"><strong>Tools:</strong> {p.technologies}</p>}{p.link && <p className="break-all text-xs" style={{color: accent.hex}}>{p.link}</p>}{p.description && <RichPreview value={p.description} />}</div>)}</div></div>}
{cvData.certifications.some(c => c.name.trim()) && <div><h3 className="mb-3 border-b pb-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: accent.hex, borderColor: accent.hex + '33' }}>Certifications & Training</h3><div className="space-y-2">{cvData.certifications.filter(c => c.name.trim()).map((c,i) => <div key={i}><p className="text-sm font-bold text-slate-900">{c.name}</p><p className="text-xs text-slate-700">{[c.issuer, c.issueDate ? dateLabel(c.issueDate) : ''].filter(Boolean).join(' · ')}</p>{c.credentialId && <p className="text-[11px] text-slate-500">Credential ID: {c.credentialId}</p>}{c.url && <p className="break-all text-xs" style={{color: accent.hex}}>{c.url}</p>}</div>)}</div></div>}
{Boolean(skills || (cvData.skillGroups || []).some(g => g.name && g.skills) || cvData.softSkills || cvData.languages || cvData.hobbies) && <div><h3 className="mb-3 border-b pb-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: accent.hex, borderColor: accent.hex + "33" }}>Skills & Additional Information</h3>
<div className="space-y-2 text-xs text-slate-700">{(cvData.skillGroups || []).filter(g => g.name && g.skills).map((g,i) => <p key={i}><strong>{g.name}:</strong> {g.skills}</p>)}{skills && <p><strong>Additional Skills:</strong> {skills}</p>}{cvData.softSkills && <p><strong>Soft Skills:</strong> {cvData.softSkills}</p>}{cvData.languages && <p><strong>Languages:</strong> {cvData.languages}</p>}{cvData.hobbies && <p><strong>Hobbies & Interests:</strong> {cvData.hobbies}</p>}</div>
</div>}
{!cvData.bio && !cvData.experiences.length && !cvData.qualifications.length && !skills && !(cvData.skillGroups || []).some(g => g.name && g.skills) && <p className="py-16 text-center text-sm text-slate-400">Start editing your details to build your resume.</p>}
</div>
<p className="mt-3 text-center text-[11px] text-slate-500">Screen preview approximates the PDF layout. Use Download PDF to inspect exact page breaks.</p>
</section>
</div>
</div>
</main>
)
}
export default function DashboardPage() {
return (
<Suspense fallback={<div className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-600">Loading resume workspace…</div>}>
<DashboardContent />
</Suspense>
)
}
