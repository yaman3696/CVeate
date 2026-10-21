'use client'
import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
type Experience = { role: string; company: string; duration: string; bullets: string; startDate?: string; endDate?: string; current?: boolean }
type Education = { degree: string; institution: string; year: string; startDate?: string; endDate?: string; current?: boolean }
type Project = { name: string; role: string; technologies: string; link: string; startDate: string; endDate: string; current: boolean; description: string }
type Certification = { name: string; issuer: string; issueDate: string; credentialId: string; url: string }
const blankProject = (): Project => ({ name: '', role: '', technologies: '', link: '', startDate: '', endDate: '', current: false, description: '' })
const blankCertification = (): Certification => ({ name: '', issuer: '', issueDate: '', credentialId: '', url: '' })
type Group = { name: string; skills: string }
type FormData = {
fullName: string; headline: string; email: string; phone: string; city: string; state: string; pincode: string
linkedin: string; portfolioLinks: string[]; bio: string; experiences: Experience[]; qualifications: Education[]
technicalSkills: string; softSkills: string; hobbies: string; languages: string; skillGroups: Group[]
projects: Project[]; certifications: Certification[]; careerStage: string; profession: string; dateOfBirth: string; includeDob: boolean; accentColor: string
}
const blankExp = (): Experience => ({ role: '', company: '', duration: '', bullets: '', startDate: '', endDate: '', current: false })
const blankEdu = (): Education => ({ degree: '', institution: '', year: '', startDate: '', endDate: '', current: false })
const EMPTY: FormData = {
fullName: '', headline: '', email: '', phone: '', city: '', state: '', pincode: '', linkedin: '', portfolioLinks: [''], bio: '',
experiences: [blankExp()], qualifications: [blankEdu()], technicalSkills: '', softSkills: '', hobbies: '', languages: '', skillGroups: [],
projects: [], certifications: [], careerStage: 'fresher', profession: 'other', dateOfBirth: '', includeDob: false, accentColor: 'indigo',
}
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
const label = 'mb-1 block text-xs font-bold text-slate-600'
const button = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50'
const professionOptions = [
['other', 'Other / General'], ['design', 'Design & Creative'], ['technology', 'Software & Technology'],
['business', 'Business, Sales & Operations'], ['finance', 'Finance & Accounting'], ['marketing', 'Marketing & Media'],
['education', 'Education & Research'], ['healthcare', 'Healthcare'], ['engineering', 'Engineering & Manufacturing'],
['hospitality', 'Hospitality & Service'], ['administration', 'HR & Administration'],
]
const examples: Record<string, string> = {
design: 'Designed brand assets using Illustrator and Photoshop for a student-led campaign.',
technology: 'Built a responsive website using React and CSS as an academic project.',
business: 'Conducted competitor research and presented findings for a university project.',
finance: 'Analyzed sample financial statements using Excel and presented key findings.',
marketing: 'Planned social media content and evaluated engagement for a college initiative.',
education: 'Prepared instructional materials and delivered a presentation to peers.',
healthcare: 'Completed supervised practical training and documented observations accurately.',
engineering: 'Designed and tested a prototype as part of a final-year project.',
hospitality: 'Coordinated guest registration and logistics for a student event.',
administration: 'Organized volunteer schedules and communicated updates to event participants.',
other: 'Completed a relevant project using specific tools or methods and documented the outcome.',
}
const actionVerbs = ['Designed', 'Built', 'Developed', 'Created', 'Analyzed', 'Coordinated', 'Improved', 'Led', 'Implemented', 'Researched', 'Delivered', 'Organized', 'Supported', 'Tested']
// Assemble grammatical achievement bullets without AI or invented claims.
function buildAchievement(verb: string, task: string, tools: string, result: string): string {
const tidy = (value: string) => value.trim().replace(/[.!?,;:]+\s*$/g, '').replace(/\s+/g, ' ')
const activity = tidy(task)
if (!activity) return 'Describe what you did to preview your achievement.'
const knownTools: Record<string, string> = {
photoshop: 'Photoshop', illustrator: 'Illustrator', figma: 'Figma', excel: 'Excel',
powerpoint: 'PowerPoint', 'adobe photoshop': 'Adobe Photoshop',
'adobe illustrator': 'Adobe Illustrator', 'ms excel': 'MS Excel',
react: 'React', python: 'Python', javascript: 'JavaScript',
}
const toolList = tools.split(/,|;/).map(tidy).filter(Boolean).map(tool => knownTools[tool.toLowerCase()] || tool)
const toolPhrase = toolList.length === 1 ? toolList[0] : toolList.length === 2
? `${toolList[0]} and ${toolList[1]}`
: `${toolList.slice(0, -1).join(', ')}, and ${toolList[toolList.length - 1]}`
const main = `${verb} ${activity}${toolPhrase ? ` using ${toolPhrase}` : ''}`
const outcome = tidy(result)
if (!outcome) return `${main}.`
// Results phrased as verbs become a second sentence; noun phrases retain a neutral label.
const verbStart = /^(supported|improved|increased|reduced|achieved|delivered|enabled|helped|strengthened|streamlined|boosted|saved|generated|enhanced|accelerated|contributed|resulted|led|created|raised|maintained|ensured|produced|optimized|optimised)\b/i
if (verbStart.test(outcome)) return `${main}. This work ${outcome.charAt(0).toLowerCase()}${outcome.slice(1)}.`
return `${main}. Outcome: ${outcome.charAt(0).toUpperCase()}${outcome.slice(1)}.`
}
function cleanHtml(value: string) {
if (typeof document === 'undefined') return value
const root = document.createElement('template'); root.innerHTML = value
const allowed = new Set(['P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM'])
function scrub(parent: ParentNode) {
Array.from(parent.childNodes).forEach(node => {
if (node.nodeType === Node.COMMENT_NODE) { node.parentNode?.removeChild(node); return }
if (node.nodeType !== Node.ELEMENT_NODE) return
const el = node as HTMLElement
if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'FORM'].includes(el.tagName)) { el.remove(); return }
scrub(el)
if (!allowed.has(el.tagName)) { el.replaceWith(...Array.from(el.childNodes)); return }
Array.from(el.attributes).forEach(a => el.removeAttribute(a.name))
})
}
scrub(root.content); return root.innerHTML
}
function textOnly(html: string) {
return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
}
function writingTips(html: string, kind: 'summary' | 'bullets', stage: string): string[] {
const text = textOnly(html)
if (!text) return [kind === 'summary' ? 'Introduce your target role, strongest relevant skills, and evidence of your work.' : stage === 'fresher' ? 'Projects, internships, volunteering, and coursework count. Describe what you personally did.' : 'Describe the work you did, the skills used, and a verified outcome where possible.']
const tips: string[] = []
if (/\b(responsible for|worked on|hardworking|go.getter|team player|various tasks)\b/i.test(text)) tips.push('Replace vague phrases with specific tasks, tools, and contributions.')
if (kind === 'summary') {
if (text.split(/\s+/).length > 95) tips.push('Try shortening your summary to around 40–90 words for readability.')
if (text.split(/\s+/).length < 20) tips.push('Consider mentioning your target role, relevant skills, and one supporting example.')
} else {
const lines = html.replace(/<\/(?:li|p|div)>/gi, '\n').replace(/<br\s*\/?\s*>/gi, '\n').split('\n').map(textOnly).filter(Boolean)
if (lines.some(line => line.split(/\s+/).length > 40)) tips.push('Some achievement lines are long. Keep each bullet focused on one contribution.')
if (lines.some(line => line.length > 15 && !actionVerbs.some(v => line.toLowerCase().startsWith(v.toLowerCase())))) tips.push('Where natural, start achievement bullets with an action verb such as Designed, Built, Analyzed, or Coordinated.')
if (!/\d/.test(text)) tips.push('Add a measurable result only if you know it. Numbers are helpful, not mandatory.')
}
return tips.slice(0, 3)
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
function RichEditor({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
const [element, setElement] = useState<HTMLDivElement | null>(null)
useEffect(() => { if (element && element.innerHTML !== value) element.innerHTML = cleanHtml(value) }, [element, value])
const format = (cmd: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList') => {
element?.focus(); document.execCommand(cmd, false); if (element) onChange(cleanHtml(element.innerHTML))
}
return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-100">
<div className="flex gap-1 border-b border-slate-100 bg-slate-50 p-2">
{[
  { cmd: 'bold', title: 'Bold', icon: 'bold' },
  { cmd: 'italic', title: 'Italic', icon: 'italic' },
  { cmd: 'insertUnorderedList', title: 'Bulleted list', icon: 'bullets' },
  { cmd: 'insertOrderedList', title: 'Numbered list', icon: 'numbers' },
].map(x =>
  <button type="button" key={x.cmd} title={x.title} aria-label={x.title} onMouseDown={e => e.preventDefault()} onClick={() => format(x.cmd as 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList')} className="rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-100"><FormatIcon name={x.icon} /></button>
)}
</div>
<div ref={setElement} contentEditable suppressContentEditableWarning role="textbox" aria-label={ariaLabel} aria-multiline="true" onInput={e => onChange(cleanHtml(e.currentTarget.innerHTML))} className="min-h-28 px-3 py-3 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" />
</div>
}
// Defined outside OnboardingContent so React does not remount the input on every keystroke.
function Field({
  name,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  required = false,
  disabled = false,
  min,
}: {
  name: string
  value: string
  onChange: (s: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  disabled?: boolean
  min?: string
}) {
  return (
    <label className="block">
      <span className={label}>
        {name}{required && ' *'}
      </span>
      <input
        className={`${input} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}
function OnboardingContent() {
const router = useRouter(); const params = useSearchParams()
const [step, setStep] = useState(1); const [data, setData] = useState<FormData>(EMPTY)
const [error, setError] = useState('');
useEffect(() => {
  if (!error) return

  const timer = window.setTimeout(() => {
    const errorElement = document.getElementById('onboarding-error')

    if (errorElement) {
      errorElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, 100)

  return () => window.clearTimeout(timer)
}, [error])
const [saving, setSaving] = useState(false); const [autofilled, setAutofilled] = useState(false)
const [showCategories, setShowCategories] = useState(false); const [builder, setBuilder] = useState({ verb: 'Created', task: '', tools: '', result: '' }); const [builderIndex, setBuilderIndex] = useState<number | null>(null)
const patch = (next: Partial<FormData>) => setData(prev => ({ ...prev, ...next }))
useEffect(() => {
if (params.get('autofill') !== 'true') return
try {
const raw = sessionStorage.getItem('cveate_ats_data'); if (!raw) return
const p = JSON.parse(raw)?.extractedProfile; if (!p) return
setData(prev => ({ ...prev,
fullName: p.fullName || prev.fullName, headline: p.headline || prev.headline, email: p.email || prev.email,
phone: p.phone || prev.phone, city: p.city || prev.city, state: p.state || prev.state,
pincode: p.pincode || prev.pincode, linkedin: p.linkedin || prev.linkedin,
portfolioLinks: p.portfolioLinks?.length ? p.portfolioLinks : p.portfolio ? [p.portfolio] : prev.portfolioLinks,
bio: p.bio || prev.bio, experiences: Array.isArray(p.experiences) && p.experiences.length ? p.experiences.map((e: Experience) => ({ ...blankExp(), ...e })) : prev.experiences,
qualifications: Array.isArray(p.qualifications) && p.qualifications.length ? p.qualifications.map((q: Education) => ({ ...blankEdu(), ...q })) : prev.qualifications,
technicalSkills: Array.isArray(p.technicalSkills) ? p.technicalSkills.join(', ') : p.technicalSkills || prev.technicalSkills,
softSkills: p.softSkills || prev.softSkills, hobbies: p.hobbies || prev.hobbies, languages: p.languages || prev.languages,
skillGroups: Array.isArray(p.skillGroups) ? p.skillGroups : prev.skillGroups,
        projects: Array.isArray(p.projects) ? p.projects.map((x: Project) => ({ ...blankProject(), ...x })) : prev.projects,
        certifications: Array.isArray(p.certifications) ? p.certifications.map((x: Certification) => ({ ...blankCertification(), ...x })) : prev.certifications,
})); setAutofilled(true)
} catch (e) { console.error('ATS autofill could not be loaded', e) }
}, [params])
const changeExp = (i: number, patchExp: Partial<Experience>) => patch({ experiences: data.experiences.map((e, n) => n === i ? { ...e, ...patchExp } : e) })
const changeProject = (i: number, fields: Partial<Project>) => patch({ projects: data.projects.map((p, n) => n === i ? { ...p, ...fields } : p) })
  const changeCertification = (i: number, fields: Partial<Certification>) => patch({ certifications: data.certifications.map((c, n) => n === i ? { ...c, ...fields } : c) })
  const changeEdu = (i: number, patchEdu: Partial<Education>) => patch({ qualifications: data.qualifications.map((q, n) => n === i ? { ...q, ...patchEdu } : q) })
const tipsBox = (tips: string[]) => <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-950"><p className="mb-1 font-bold">Writing guidance</p>{tips.map((t, i) => <p key={i} className="mt-1">• {t}</p>)}</div>
const next = () => {
if (step === 1 && (!data.fullName.trim() || !data.headline.trim() || !/^\S+@\S+\.\S+$/.test(data.email) || !data.phone.trim() || !data.city.trim() || !data.state.trim())) { setError('Please complete your name, headline, valid email, mobile number, city and state.'); return }
if (step === 1 && !/^\d{10}$/.test(data.phone)) { setError('Mobile number must contain exactly 10 digits.'); return }
if (step === 1 && data.pincode && !/^\d{6}$/.test(data.pincode)) { setError('PIN code must contain exactly 6 digits if provided.'); return }
if (step === 2 && data.experiences.some(e => (e.role || e.company || textOnly(e.bullets) || e.startDate || e.duration) && (!e.role.trim() || !e.company.trim() || !textOnly(e.bullets)))) { setError('Complete each started work experience, or remove the incomplete entry. Freshers can skip this step.'); return }
if (step === 3 && data.projects.some(p => (p.name || p.role || p.technologies || p.link || p.startDate || textOnly(p.description)) && !p.name.trim())) { setError('Please name each project you started, or remove the incomplete entry.'); return }
    if (step === 3 && data.certifications.some(c => (c.name || c.issuer || c.issueDate || c.credentialId || c.url) && !c.name.trim())) { setError('Please name each certification you started, or remove the incomplete entry.'); return }
    if (
      step === 3 &&
      !data.qualifications.some(
        q => q.degree.trim() && q.institution.trim()
      )
    ) {
      setError('Please add at least one qualification with its degree or course name and institution.')
      return
    }
    if (
      step === 4 &&
      !data.technicalSkills.split(',').some(skill => skill.trim()) &&
      !data.skillGroups.some(group =>
        group.skills.split(',').some(skill => skill.trim())
      )
    ) {
      setError('Please add at least one skill before continuing.')
      return
    }
setError(''); setStep(n => Math.min(n + 1, 4)); window.scrollTo({ top: 0, behavior: 'smooth' })
}
const submit = async () => {
  const invalidExperience = data.experiences.some(e =>
    (e.current && !!e.endDate) ||
    (!e.current &&
      !!e.startDate &&
      !!e.endDate &&
      e.endDate < e.startDate)
  )

  const invalidQualification = data.qualifications.some(q =>
    (q.current && !!q.endDate) ||
    (!q.current &&
      !!q.startDate &&
      !!q.endDate &&
      q.endDate < q.startDate)
  )

  if (invalidExperience || invalidQualification) {
    setError(
      'Please correct the dates. End month cannot be earlier than Start month, and current positions must not have an End month.'
    )
    setStep(invalidExperience ? 2 : 3)
    return
  }
  // Require at least one complete qualification
  const hasQualification = data.qualifications.some(
    q => q.degree.trim() && q.institution.trim()
  )

  if (!hasQualification) {
    setError('Please add at least one qualification with its degree or course name and institution.')
    setStep(3)
    return
  }

  // Require at least one skill
  const hasSkill =
    data.technicalSkills.split(',').some(skill => skill.trim()) ||
    data.skillGroups.some(group =>
      group.skills.split(',').some(skill => skill.trim())
    )

  if (!hasSkill) {
    setError('Please add at least one skill before creating your CV.')
    return
  }

  // Require at least one known language
  if (!data.languages.split(',').some(language => language.trim())) {
    setError('Please add at least one language you know before creating your CV.')
    return
  }

  setSaving(true)
  setError('')
try {
const { data: auth } = await supabase.auth.getSession()
const experiences = data.experiences.filter(e => e.role.trim() || e.company.trim() || textOnly(e.bullets))
const qualifications = data.qualifications.filter(q => q.degree.trim() || q.institution.trim())
const projects = data.projects.filter(p => p.name.trim())
      const certifications = data.certifications.filter(c => c.name.trim())
      const payload = { ...data, experiences, qualifications, projects, certifications, portfolio: data.portfolioLinks.filter(Boolean).join(', '), bio: cleanHtml(data.bio),
skillGroups: data.skillGroups.filter(g => g.name.trim() && g.skills.trim()),
technicalSkills: data.technicalSkills,
}
const id = auth.session?.user?.id
if (id) {
sessionStorage.setItem(`cveate_resume_data_${id}`, JSON.stringify(payload))
localStorage.setItem(`cveate_profile_${id}`, JSON.stringify(payload))
} else {
sessionStorage.setItem('cveate_resume_data_guest', JSON.stringify(payload))
localStorage.setItem('cveate_profile', JSON.stringify(payload))
}
router.push('/dashboard')
} catch (e) { console.error(e); setError('Could not save your CV draft. Please try again.'); setSaving(false) }
}
const skillItems = data.technicalSkills.split(',').map(s => s.trim()).filter(Boolean)
const repeatedSkills = skillItems.filter(s => data.skillGroups.some(g => g.skills.split(',').some(t => t.trim().toLowerCase() === s.toLowerCase())))
const bullet = buildAchievement(builder.verb, builder.task, builder.tools, builder.result)
return <main className="min-h-screen bg-slate-50 px-3 py-8 text-slate-900 sm:px-5"><div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-9">
<div className="mb-6 flex items-start justify-between gap-3 border-b border-slate-100 pb-5"><div><h1 className="text-xl font-extrabold">{['', 'Personal information', 'Experience & achievements', 'Education, projects & certificates', 'Skills & expertise'][step]}</h1><p className="mt-1 text-xs text-slate-500">Create and download your CV without signing in. Writing tips are always free.</p></div><span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">Step {step} of 4</span></div>
<div className="mb-6 grid grid-cols-4 gap-2">{[1,2,3,4].map(n => <div key={n} className={`h-1.5 rounded-full ${n <= step ? 'bg-indigo-600' : 'bg-slate-100'}`} />)}</div>
{autofilled && <div className="mb-5 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800">Your ATS analysis details have been pre-filled. Review them before continuing.</div>}
{error && <div id="onboarding-error" role="alert" className="scroll-mt-32 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
{step === 1 && <div className="space-y-5">
<div className="grid gap-4 sm:grid-cols-2"><label><span className={label}>Career stage</span><select className={input} value={data.careerStage} onChange={e => patch({ careerStage: e.target.value })}><option value="fresher">Student / Fresher</option><option value="experienced">Experienced professional</option><option value="manager">Manager / Team lead</option><option value="senior">Senior leader / Executive</option></select></label><label><span className={label}>Profession / target field</span><select className={input} value={data.profession} onChange={e => patch({ profession: e.target.value })}>{professionOptions.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label></div>
{tipsBox([data.careerStage === 'fresher' ? 'Highlight projects, internships, volunteering and relevant coursework. Employment is not required.' : data.careerStage === 'senior' ? 'Emphasize strategic scope, leadership and business outcomes.' : data.careerStage === 'manager' ? 'Highlight team leadership, coordination, delivery and process improvements.' : 'Highlight relevant tools, achievements and verified outcomes.', `Example style: ${examples[data.profession]}`])}
<div className="grid gap-4 sm:grid-cols-2"><Field name="Full name" required value={data.fullName} onChange={fullName => patch({ fullName })} /><Field name="Professional headline / target role" required value={data.headline} onChange={headline => patch({ headline })} placeholder="e.g. Junior Graphic Designer" /><Field name="Email" required type="email" value={data.email} onChange={email => patch({ email })} /><Field name="Mobile number (10 digits)" required type="tel" value={data.phone} onChange={phone => patch({ phone: phone.replace(/\D/g, '').slice(0, 10) })} /><Field name="City" required value={data.city} onChange={city => patch({ city })} /><Field name="State" required value={data.state} onChange={state => patch({ state })} /><Field name="PIN code (6 digits, optional)" value={data.pincode} onChange={pincode => patch({ pincode: pincode.replace(/\D/g, '').slice(0, 6) })} /><Field name="LinkedIn (optional)" value={data.linkedin} onChange={linkedin => patch({ linkedin })} /></div>
<div><span className={label}>Portfolio / GitHub / Behance links (optional)</span>{data.portfolioLinks.map((link, i) => <div key={i} className="mb-2 flex gap-2"><input aria-label={`Portfolio link ${i+1}`} className={input} value={link} onChange={e => patch({ portfolioLinks: data.portfolioLinks.map((x, n) => n === i ? e.target.value : x) })} placeholder="https://..." /><button type="button" className={button} onClick={() => patch({ portfolioLinks: data.portfolioLinks.filter((_, n) => n !== i) })}>Remove</button></div>)}<button type="button" className="text-xs font-semibold text-indigo-700" onClick={() => patch({ portfolioLinks: [...data.portfolioLinks, ''] })}>+ Add link</button></div>
<div className="grid gap-4 sm:grid-cols-2"><Field name="Date of birth (optional)" type="date" value={data.dateOfBirth} onChange={dateOfBirth => patch({ dateOfBirth })} /><label className="flex items-center gap-2 self-end pb-3 text-xs text-slate-600"><input type="checkbox" checked={data.includeDob} onChange={e => patch({ includeDob: e.target.checked })} />Include date of birth in PDF</label></div>
<div><p className={label}>Professional summary</p><RichEditor ariaLabel="Professional summary" value={data.bio} onChange={bio => patch({ bio })} />{!textOnly(data.bio) && <div className="mt-2">{tipsBox(writingTips(data.bio, 'summary', data.careerStage))}</div>}</div>
</div>}
{step === 2 && <div className="space-y-5">
{tipsBox([data.careerStage === 'fresher' ? 'No previous job? Leave experience empty. Your education and skills can still form a valid CV.' : 'Describe each role using specific action verbs, relevant tools and genuine results.', `Example for your field: ${examples[data.profession]}`])}
{data.experiences.map((e, i) => <div key={i} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"><div className="flex justify-between"><strong className="text-sm">Experience {i + 1}</strong><button type="button" className="text-xs font-semibold text-red-600" onClick={() => patch({ experiences: data.experiences.filter((_, n) => n !== i) })}>Remove</button></div>
<div className="grid gap-3 sm:grid-cols-2"><Field name="Role / job title" value={e.role} onChange={role => changeExp(i, { role })} /><Field name="Company / organization" value={e.company} onChange={company => changeExp(i, { company })} /><Field
  name="Start month"
  type="month"
  value={e.startDate || ''}
  onChange={startDate =>
    changeExp(i, {
      startDate,
      endDate:
        e.endDate && startDate && e.endDate < startDate
          ? ''
          : e.endDate,
    })
  }
/>

<Field
  name="End month"
  type="month"
  value={e.current ? '' : e.endDate || ''}
  min={e.startDate || undefined}
  disabled={!!e.current}
  onChange={endDate => {
    if (e.current) return
    if (e.startDate && endDate && endDate < e.startDate) return
    changeExp(i, { endDate })
  }}
/></div>
<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!e.current} onChange={ev => changeExp(i, { current: ev.target.checked, endDate: ev.target.checked ? '' : e.endDate })} />I currently work here</label>
{!e.startDate && <Field name="Legacy duration (optional)" value={e.duration} onChange={duration => changeExp(i, { duration })} placeholder="e.g. Jan 2023 – Dec 2024" />}
<div><p className={label}>Key achievements / responsibilities</p><RichEditor ariaLabel={`Experience ${i + 1} achievements`} value={e.bullets} onChange={bullets => changeExp(i, { bullets })} /><div className="mt-2">{tipsBox(writingTips(e.bullets, 'bullets', data.careerStage))}</div></div>
<button type="button" className="text-xs font-bold text-indigo-700" onClick={() => { setBuilderIndex(builderIndex === i ? null : i); setBuilder({ verb: 'Created', task: '', tools: '', result: '' }) }}>+ Guided achievement builder</button>
{builderIndex === i && <div className="space-y-3 rounded-xl border border-indigo-100 bg-white p-3"><p className="text-xs font-bold">Build a bullet from your real experience</p><p className="text-xs text-slate-500">Enter a real task and optional outcome. The builder will structure the wording without AI.</p><label><span className={label}>Action verb</span><select className={input} value={builder.verb} onChange={ev => setBuilder({ ...builder, verb: ev.target.value })}>{actionVerbs.map(v => <option key={v}>{v}</option>)}</select></label><Field name="What did you do?" value={builder.task} onChange={task => setBuilder({ ...builder, task })} /><Field name="Tools or methods (optional)" value={builder.tools} onChange={tools => setBuilder({ ...builder, tools })} /><Field name="Verified result (optional)" value={builder.result} onChange={result => setBuilder({ ...builder, result })} /><p className="rounded-lg bg-slate-50 p-3 text-xs">{bullet}</p><button type="button" disabled={!builder.task.trim()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={() => { changeExp(i, { bullets: `${e.bullets}${e.bullets ? '' : ''}<ul><li>${bullet.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</li></ul>` }); setBuilderIndex(null) }}>Add to achievements</button></div>}
</div>)}
<button type="button" className={button} onClick={() => patch({ experiences: [...data.experiences, blankExp()] })}>+ Add experience</button>
</div>}
{step === 3 && <div className="space-y-5">
{tipsBox([data.careerStage === 'fresher' ? 'Put your most relevant education first. Academic projects can be described in the experience section for now.' : 'List relevant degrees and professional qualifications; prioritize recent or job-relevant education.'])}
{data.qualifications.map((q, i) => <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"><div className="flex justify-between"><strong className="text-sm">Qualification {i + 1}</strong><button type="button" className="text-xs font-semibold text-red-600" onClick={() => patch({ qualifications: data.qualifications.filter((_, n) => n !== i) })}>Remove</button></div><Field name="Degree / qualification" value={q.degree} onChange={degree => changeEdu(i, { degree })} /><Field name="Institution / university" value={q.institution} onChange={institution => changeEdu(i, { institution })} /><div className="grid gap-3 sm:grid-cols-2"><Field
  name="Start month (optional)"
  type="month"
  value={q.startDate || ''}
  onChange={startDate =>
    changeEdu(i, {
      startDate,
      endDate:
        q.endDate && startDate && q.endDate < startDate
          ? ''
          : q.endDate,
    })
  }
/>

<Field
  name="End month (optional)"
  type="month"
  value={q.current ? '' : q.endDate || ''}
  min={q.startDate || undefined}
  disabled={!!q.current}
  onChange={endDate => {
    if (q.current) return
    if (q.startDate && endDate && endDate < q.startDate) return

    changeEdu(i, {
      endDate,
      year: endDate ? endDate.slice(0, 4) : q.year,
    })
  }}
/></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!q.current} onChange={ev => changeEdu(i, { current: ev.target.checked, endDate: ev.target.checked ? '' : q.endDate })} />Currently studying</label><Field name="Passing year (legacy / optional)" value={q.year} onChange={year => changeEdu(i, { year: year.replace(/\D/g, '').slice(0, 4) })} placeholder="e.g. 2026" /></div>)}
<button type="button" className={button} onClick={() => patch({ qualifications: [...data.qualifications, blankEdu()] })}>+ Add qualification</button>
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <div><h3 className="text-sm font-extrabold text-indigo-700">Projects (optional)</h3><p className="mt-1 text-xs text-slate-500">Academic, personal, freelance, volunteer and professional projects all count. Especially useful for freshers. Include only work you actually completed.</p></div>
        {data.projects.map((p, i) => <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex justify-between"><strong className="text-sm">Project {i + 1}</strong><button type="button" className="text-xs font-semibold text-red-600" onClick={() => patch({ projects: data.projects.filter((_, n) => n !== i) })}>Remove</button></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field name="Project name" value={p.name} onChange={name => changeProject(i, { name })} placeholder="e.g. Student portfolio website" /><Field name="Your role (optional)" value={p.role} onChange={role => changeProject(i, { role })} placeholder="e.g. UI Designer" /><Field name="Tools / technologies (optional)" value={p.technologies} onChange={technologies => changeProject(i, { technologies })} placeholder="e.g. Figma, React" /><Field name="Project link (optional)" value={p.link} onChange={link => changeProject(i, { link })} placeholder="https://..." /><Field name="Start month (optional)" type="month" value={p.startDate} onChange={startDate => changeProject(i, { startDate })} /><Field name="End month (optional)" type="month" value={p.endDate} onChange={endDate => changeProject(i, { endDate })} /></div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={p.current} onChange={e => changeProject(i, { current: e.target.checked, endDate: e.target.checked ? '' : p.endDate })} />Ongoing project</label>
          <div><p className={label}>What did you build or contribute?</p><RichEditor ariaLabel={`Project ${i + 1} description`} value={p.description} onChange={description => changeProject(i, { description })} />{!textOnly(p.description) && <p className="mt-2 text-xs text-slate-500">Describe your contribution, relevant tools and a genuine outcome. Numbers are optional.</p>}</div>
        </div>)}
        <button type="button" className={button} onClick={() => patch({ projects: [...data.projects, blankProject()] })}>+ Add project</button>
      </div>
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <div><h3 className="text-sm font-extrabold text-indigo-700">Certifications & training (optional)</h3><p className="mt-1 text-xs text-slate-500">Add completed courses, professional certifications or relevant training. Include a verification link if available.</p></div>
        {data.certifications.map((c, i) => <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex justify-between"><strong className="text-sm">Certification {i + 1}</strong><button type="button" className="text-xs font-semibold text-red-600" onClick={() => patch({ certifications: data.certifications.filter((_, n) => n !== i) })}>Remove</button></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field name="Certification / course name" value={c.name} onChange={name => changeCertification(i, { name })} /><Field name="Issuing organization (optional)" value={c.issuer} onChange={issuer => changeCertification(i, { issuer })} /><Field name="Issued month (optional)" type="month" value={c.issueDate} onChange={issueDate => changeCertification(i, { issueDate })} /><Field name="Credential ID (optional)" value={c.credentialId} onChange={credentialId => changeCertification(i, { credentialId })} /><div className="sm:col-span-2"><Field name="Credential URL (optional)" value={c.url} onChange={url => changeCertification(i, { url })} placeholder="https://..." /></div></div>
        </div>)}
        <button type="button" className={button} onClick={() => patch({ certifications: [...data.certifications, blankCertification()] })}>+ Add certification</button>
      </div>
    </div>}
{step === 4 && <div className="space-y-5">
{tipsBox(['Include skills you genuinely possess and can explain in an interview.', 'Use standard names for tools, technologies and professional methods; avoid keyword stuffing.'])}
<label className="block"><span className={label}>Quick-add skills (comma-separated)</span><textarea className={input} rows={3} value={data.technicalSkills} onChange={e => patch({ technicalSkills: e.target.value })} placeholder="e.g. Excel, Figma, Customer Research, Python" /></label>
<button type="button" className="text-xs font-bold text-indigo-700" onClick={() => setShowCategories(v => !v)}>{showCategories ? '− Hide' : '+ Organize'} skills by category (optional)</button>
{showCategories && <div className="space-y-3 rounded-xl bg-indigo-50/50 p-3">{data.skillGroups.map((g, i) => <div key={i} className="space-y-2 rounded-xl border bg-white p-3"><Field name="Category" value={g.name} onChange={name => patch({ skillGroups: data.skillGroups.map((x, n) => n === i ? { ...x, name } : x) })} placeholder="e.g. Design Tools" /><Field name="Skills (comma-separated)" value={g.skills} onChange={skills => patch({ skillGroups: data.skillGroups.map((x, n) => n === i ? { ...x, skills } : x) })} /><button type="button" className="text-xs font-bold text-red-600" onClick={() => patch({ skillGroups: data.skillGroups.filter((_, n) => n !== i) })}>Remove category</button></div>)}<button type="button" className={button} onClick={() => patch({ skillGroups: [...data.skillGroups, { name: '', skills: '' }] })}>+ Add category</button>{repeatedSkills.length > 0 && <p className="text-xs text-amber-700">Skills already in categories will not be repeated in the dashboard: {repeatedSkills.join(', ')}</p>}</div>}
<Field name="Soft skills (optional)" value={data.softSkills} onChange={softSkills => patch({ softSkills })} placeholder="Communication, Leadership" /><Field name="Languages *" value={data.languages} onChange={languages => patch({ languages })} /><Field name="Hobbies & interests (optional)" value={data.hobbies} onChange={hobbies => patch({ hobbies })} />
<div className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-900"><strong>You're ready to create your CV.</strong> The next page lets you edit, preview and download your PDF without logging in or spending Career Credits.</div>
</div>}
<div className="mt-8 flex justify-between border-t border-slate-100 pt-6">{step > 1 ? <button type="button" className={button} onClick={() => { setError(''); setStep(step - 1) }}>Back</button> : <span />}{step < 4 ? <button type="button" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700" onClick={next}>Continue</button> : <button type="button" disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50" onClick={submit}>{saving ? 'Creating…' : 'Create My CV →'}</button>}</div>
</div></main>
}
export default function OnboardPage() { return <Suspense fallback={<div className="p-8 text-center">Loading onboarding…</div>}><OnboardingContent /></Suspense> }
