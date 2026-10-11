'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [savingStatus, setSavingStatus] = useState(false)

  const [cvData, setCvData] = useState({
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    pincode: '',
    linkedin: '',
    portfolio: '',
    bio: '',
    experiences: [],
    qualifications: [],
    technicalSkills: [],
    softSkills: '',
    hobbies: '',
    languages: ''
  })

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
  
      // Check user-scoped storage or guest storage
      const storageKeys = userId 
        ? [`cveate_resume_data_${userId}`, `cveate_profile_${userId}`]
        : ['cveate_resume_data_guest', 'cveate_profile']
  
      for (const key of storageKeys) {
        const stored = sessionStorage.getItem(key) || localStorage.getItem(key)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            setCvData(parsed)
            if (searchParams.get('download') === 'true') {
              setTimeout(() => handleDownloadPDF(), 500)
            }
            return
          } catch (e) {
            console.error(e)
          }
        }
      }
  
      // Fallback to Supabase database if local storage is empty and user is logged in
      if (userId) {
        const { data: primaryCv } = await supabase
          .from('cv_history')
          .select('cv_data')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .single()
  
        if (primaryCv?.cv_data) {
          setCvData(primaryCv.cv_data)
        }
      }
  
      if (searchParams.get('download') === 'true') {
        setTimeout(() => handleDownloadPDF(), 500)
      }
    }
  
    loadUserData()
  }, [searchParams])

  const cleanHtmlForPdf = (html: string) => {
    if (!html) return ''
    return html
      .replace(/<\/li>/g, '\n')
      .replace(/<li>/g, '• ')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .trim()
  }

  const handleSaveToHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in to save your CV to history.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_name')
        .eq('id', session.user.id)
        .single()

      const plan = (profile?.plan_name || 'Freemium').toLowerCase()
      const limit = plan.includes('monthly') ? 100 : plan.includes('daily') ? 10 : 2

      const { count } = await supabase
        .from('cv_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      if (count !== null && count >= limit) {
        alert(`Storage limit reached for your ${profile?.plan_name || 'Freemium'} plan (Max ${limit} CVs). Please upgrade to save more.`)
        return
      }

      setSavingStatus(true)

      const { error } = await supabase.from('cv_history').insert([{
        user_id: session.user.id,
        cv_title: `${cvData.fullName || 'Professional'} Resume`,
        match_score: 92,
        is_primary: count === 0,
        cv_data: cvData
      }])

      if (error) throw error

      alert('CV saved to history successfully!')
      setSavingStatus(false)
    } catch (err: any) {
      alert(err.message || 'Failed to save CV.')
      setSavingStatus(false)
    }
  }

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    })

    const margin = 15
    let y = 18
    const pageWidth = 210
    const pageHeight = 295
    const printableWidth = pageWidth - (margin * 2)

    const addText = (
      text: string, 
      fontSize: number, 
      isBold: boolean, 
      color: [number, number, number], 
      spaceAfter = 4, 
      align: 'left' | 'center' = 'left', 
      linkUrl?: string
    ) => {
      doc.setFont('Helvetica', isBold ? 'bold' : 'normal')
      doc.setFontSize(fontSize)
      doc.setTextColor(color[0], color[1], color[2])
      
      const lines = doc.splitTextToSize(text, printableWidth)
      const blockHeight = (lines.length * (fontSize * 0.38)) + spaceAfter

      if (y + blockHeight > pageHeight - margin) {
        doc.addPage()
        y = 18
      }

      const xPos = align === 'center' ? pageWidth / 2 : margin

      if (linkUrl) {
        doc.text(lines, xPos, y, { align })
        const textWidth = doc.getTextWidth(text)
        const textHeight = fontSize * 0.38
        const linkX = align === 'center' ? xPos - (textWidth / 2) : xPos
        doc.link(linkX, y - textHeight, textWidth, textHeight, { url: linkUrl })
      } else {
        doc.text(lines, xPos, y, { align })
      }

      y += blockHeight
    }

    const addSectionDivider = () => {
      y += 2
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5
    }

    const formatLink = (url: string) => {
      if (!url) return ''
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      return `https://${url}`
    }

    if (cvData.fullName) addText(cvData.fullName, 20, true, [15, 23, 42], 1, 'center')
    if (cvData.headline) addText(cvData.headline, 11, true, [79, 70, 229], 3, 'center')

    const locStr = [cvData.city, cvData.state, cvData.pincode].filter(Boolean).join(', ')
    const contactParts = [locStr, cvData.phone, cvData.email].filter(Boolean)
    if (contactParts.length > 0) {
      addText(contactParts.join('   •   '), 8.5, false, [71, 85, 105], 2, 'center')
    }

    const links = []
    if (cvData.linkedin) links.push({ label: `LinkedIn: ${cvData.linkedin}`, url: formatLink(cvData.linkedin) })
    if (cvData.portfolio) links.push({ label: `Portfolio: ${cvData.portfolio}`, url: formatLink(cvData.portfolio) })

    links.forEach(l => {
      addText(l.label, 8.5, true, [79, 70, 229], 1.5, 'center', l.url)
    })

    addSectionDivider()

    if (cvData.bio) {
      addText('PROFESSIONAL SUMMARY', 10, true, [79, 70, 229], 2)
      addText(cleanHtmlForPdf(cvData.bio), 9, false, [51, 65, 85], 2)
      addSectionDivider()
    }

    if (cvData.experiences && cvData.experiences.length > 0) {
      addText('PROFESSIONAL EXPERIENCE', 10, true, [79, 70, 229], 2)
      cvData.experiences.forEach((exp: any) => {
        addText(`${exp.role} — ${exp.company}`, 9.5, true, [15, 23, 42], 0.6)
        addText(`Duration: ${exp.duration}`, 8.5, true, [100, 116, 139], 1.2)
        addText(cleanHtmlForPdf(exp.bullets), 9, false, [71, 85, 105], 3)
      })
      addSectionDivider()
    }

    if (cvData.qualifications && cvData.qualifications.length > 0) {
      addText('QUALIFICATIONS & EDUCATION', 10, true, [79, 70, 229], 2)
      cvData.qualifications.forEach((q: any) => {
        addText(`${q.degree} — ${q.institution}`, 9.5, true, [15, 23, 42], 0.6)
        addText(`Passing Year: ${q.year}`, 8.5, true, [100, 116, 139], 2)
      })
      addSectionDivider()
    }

    addText('SKILLS & ADDITIONAL INFORMATION', 10, true, [79, 70, 229], 2)

// Fix: check technicalSkills (matching onboarding state) instead of skills
const techSkillsStr = Array.isArray(cvData.technicalSkills) 
  ? cvData.technicalSkills.join(', ') 
  : (cvData.technicalSkills ||'')

if (techSkillsStr) {
  addText('Technical Skills', 9, true, [15, 23, 42], 0.5)
  addText(techSkillsStr, 9, false, [51, 65, 85], 2)
}

if (cvData.softSkills) {
  addText('Soft Skills', 9, true, [15, 23, 42], 0.5)
  addText(cvData.softSkills, 9, false, [51, 65, 85], 2)
}

if (cvData.hobbies) {
  addText('Hobbies & Interests', 9, true, [15, 23, 42], 0.5)
  addText(cvData.hobbies, 9, false, [51, 65, 85], 2)
}

if (cvData.languages) {
  addText('Languages Known', 9, true, [15, 23, 42], 0.5)
  addText(cvData.languages, 9, false, [51, 65, 85], 1)
}

    doc.save('ATS_Optimized_Resume.pdf')
  }

  const locationString = [cvData.city, cvData.state, cvData.pincode].filter(Boolean).join(', ')

  return (
    <div className="min-h-[85vh] bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Your ATS-Optimized CV Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Minimalist Save Icon (No Box/Border) */}
            <button
              onClick={handleSaveToHistory}
              title="Save CV to History"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
            <Link href="/onboard">
              <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                Edit Profile Data
              </button>
            </Link>
            <button
              onClick={handleDownloadPDF}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
            >
              Download ATS PDF
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-100 space-y-8">
          <div className="border-b border-slate-200 pb-6 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{cvData.fullName || 'Your Name'}</h2>
            <p className="text-base font-bold text-indigo-600 mt-1">{cvData.headline || 'Professional Headline'}</p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 mt-3 font-medium">
              {locationString && <span>{locationString}</span>}
              {locationString && cvData.phone && <span className="text-slate-300">|</span>}
              {cvData.phone && <span>{cvData.phone}</span>}
              {(locationString || cvData.phone) && cvData.email && <span className="text-slate-300">|</span>}
              {cvData.email && <span>{cvData.email}</span>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-indigo-600 mt-1 font-semibold">
              {cvData.linkedin && <span>{cvData.linkedin}</span>}
              {cvData.linkedin && cvData.portfolio && <span className="text-slate-300">|</span>}
              {cvData.portfolio && <span>{cvData.portfolio}</span>}
            </div>

            <div 
              className="text-sm text-slate-700 mt-4 leading-relaxed max-w-2xl mx-auto"
              dangerouslySetInnerHTML={{ __html: cvData.bio || 'Your professional summary will appear here...' }}
            />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-4 border-b-2 border-indigo-100 pb-1.5">Professional Experience</h3>
            <div className="space-y-6">
              {cvData.experiences.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No experience added yet.</p>
              ) : (
                cvData.experiences.map((exp: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{exp.role} — <span className="text-indigo-600">{exp.company}</span></h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{exp.duration}</p>
                      <div 
                        className="text-xs text-slate-700 mt-1.5 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: exp.bullets }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-4 border-b-2 border-indigo-100 pb-1.5">Qualifications & Education</h3>
            <div className="space-y-4">
              {cvData.qualifications.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No qualifications added yet.</p>
              ) : (
                cvData.qualifications.map((q: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{q.degree}</h4>
                      <p className="text-xs font-medium text-slate-700">{q.institution}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{q.year}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 border-b-2 border-indigo-100 pb-1.5">Skills & Additional Information</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <strong className="text-slate-900 block mb-0.5">Technical Skills</strong>
                  <span className="text-slate-700">{Array.isArray(cvData.technicalSkills) ? cvData.technicalSkills.join(', ') : cvData.technicalSkills}</span>
                </div>
                {cvData.softSkills && (
                  <div>
                    <strong className="text-slate-900 block mb-0.5">Soft Skills</strong>
                    <span className="text-slate-700">{cvData.softSkills}</span>
                  </div>
                )}
                {cvData.hobbies && (
                  <div>
                    <strong className="text-slate-900 block mb-0.5">Hobbies & Interests</strong>
                    <span className="text-slate-700">{cvData.hobbies}</span>
                  </div>
                )}
                {cvData.languages && (
                  <div>
                    <strong className="text-slate-900 block mb-0.5">Languages Known</strong>
                    <span className="text-slate-700">{cvData.languages}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}