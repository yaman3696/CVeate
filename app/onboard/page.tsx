'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isAutoFilledBanner, setIsAutoFilledBanner] = useState(false)

  // Refs for editable containers
  const bioRef = useRef<HTMLDivElement | null>(null)
  const bulletRefs = useRef<(HTMLDivElement | null)[]>([])

  const [formData, setFormData] = useState({
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
    
    experiences: [
      {
        role: '',
        company: '',
        duration: '',
        bullets: ''
      }
    ],

    qualifications: [
      {
        degree: '',
        institution: '',
        year: ''
      }
    ],

    technicalSkills: '',
    softSkills: '',
    hobbies: '',
    languages: ''
  })

  // Auto-fill dynamically with extracted profile data from sessionStorage
  useEffect(() => {
    const isAutoFill = searchParams.get('autofill')

    if (isAutoFill === 'true') {
      try {
        const rawData = sessionStorage.getItem('cveate_ats_data')
        if (rawData) {
          const analysis = JSON.parse(rawData)
          const profile = analysis.extractedProfile

          if (profile) {
            setFormData(prev => ({
              ...prev,
              fullName: profile.fullName || prev.fullName,
              headline: profile.headline || prev.headline,
              email: profile.email || prev.email,
              phone: profile.phone || prev.phone,
              city: profile.city || prev.city,
              state: profile.state || prev.state,
              pincode: profile.pincode || prev.pincode,
              linkedin: profile.linkedin || prev.linkedin,
              portfolio: profile.portfolio || prev.portfolio,
              bio: profile.bio || prev.bio,
              experiences: profile.experiences?.length > 0 ? profile.experiences : prev.experiences,
              qualifications: profile.qualifications?.length > 0 ? profile.qualifications : prev.qualifications,
              technicalSkills: profile.technicalSkills || prev.technicalSkills,
              softSkills: profile.softSkills || prev.softSkills,
              hobbies: profile.hobbies || prev.hobbies,
              languages: profile.languages || prev.languages,
            }))
            setIsAutoFilledBanner(true)
          }
        }
      } catch (err) {
        console.error('Failed to load ATS auto-fill profile data from session storage:', err)
      }
    }
  }, [searchParams])

  // Sync contenteditable fields when state changes externally (e.g. auto-fill)
  useEffect(() => {
    if (bioRef.current && bioRef.current.innerHTML !== formData.bio) {
      bioRef.current.innerHTML = formData.bio || ''
    }
  }, [formData.bio, step])

  useEffect(() => {
    formData.experiences.forEach((exp, idx) => {
      const ref = bulletRefs.current[idx]
      if (ref && ref.innerHTML !== exp.bullets) {
        ref.innerHTML = exp.bullets || ''
      }
    })
  }, [formData.experiences, step])

  // Browser command executor for formatting selection
  const executeFormatting = (command: 'bold' | 'italic' | 'insertUnorderedList') => {
    document.execCommand(command, false, undefined)
  }

  const handleExperienceChange = (index: number, field: string, htmlValue: string) => {
    const updated = [...formData.experiences]
    updated[index] = { ...updated[index], [field]: htmlValue }
    setFormData({ ...formData, experiences: updated })
  }

  const addExperience = () => {
    setFormData({
      ...formData,
      experiences: [...formData.experiences, { role: '', company: '', duration: '', bullets: '' }]
    })
  }

  const removeExperience = (index: number) => {
    const updated = formData.experiences.filter((_, i) => i !== index)
    setFormData({ ...formData, experiences: updated })
  }

  const handleQualificationChange = (index: number, field: string, value: string) => {
    const updated = [...formData.qualifications]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, qualifications: updated })
  }

  const addQualification = () => {
    setFormData({
      ...formData,
      qualifications: [...formData.qualifications, { degree: '', institution: '', year: '' }]
    })
  }

  const removeQualification = (index: number) => {
    const updated = formData.qualifications.filter((_, i) => i !== index)
    setFormData({ ...formData, qualifications: updated })
  }

  const handleNext = () => {
    if (step === 1 && (!formData.fullName.trim() || !formData.headline.trim() || !formData.email.trim())) {
      setErrorMsg('Please fill in required personal details marked with *.')
      return
    }
    if (step === 2 && formData.experiences.some(exp => !exp.role.trim() || !exp.company.trim())) {
      setErrorMsg('Please fill in role and company for all work experience entries.')
      return
    }
    if (step === 3 && formData.qualifications.some(q => !q.degree.trim() || !q.institution.trim())) {
      setErrorMsg('Please fill in degree and institution for all qualifications.')
      return
    }

    setErrorMsg('')
    if (step < 4) setStep(step + 1)
  }

  const handlePrev = () => {
    setErrorMsg('')
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!formData.technicalSkills.trim()) {
      setErrorMsg('Please enter your technical skills.')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Save data strictly keyed to the current authenticated user ID in session/local storage
        // without automatically writing to cv_history (leaving history saves in user's hands)
        sessionStorage.setItem(`cveate_resume_data_${session.user.id}`, JSON.stringify(formData))
        localStorage.setItem(`cveate_profile_${session.user.id}`, JSON.stringify(formData))
      } else {
        // Fallback for guest mode
        localStorage.setItem('cveate_profile', JSON.stringify(formData))
      }

      await new Promise((resolve) => setTimeout(resolve, 800))
      router.push('/dashboard')
    } catch (error: any) {
      alert('Error saving profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 p-8 sm:p-10">
        
        {isAutoFilledBanner && (
          <div className="mb-6 rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <div>
                <h4 className="text-xs font-bold text-indigo-900">ATS Auto-Fill Active</h4>
                <p className="text-[11px] text-indigo-600">Your resume details have been extracted and pre-filled from your CV!</p>
              </div>
            </div>
            <button 
              onClick={() => setIsAutoFilledBanner(false)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {step === 1 && 'Personal Information & Links'}
              {step === 2 && 'Work Experience'}
              {step === 3 && 'Qualifications & Education'}
              {step === 4 && 'Skills, Hobbies & Languages'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Strict ATS parser compatibility builder</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 border border-indigo-100">
            Step {step} of 4
          </span>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="space-y-5">
          {/* STEP 1: PERSONAL INFO */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Professional Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. john.doe@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. New Delhi"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Delhi"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 110001"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="e.g. linkedin.com/in/johndoe"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Portfolio / GitHub / Behance</label>
                  <input
                    type="text"
                    value={formData.portfolio}
                    onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                    placeholder="e.g. github.com/johndoe"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Professional Summary</label>
                  
                  {/* Bio Formatting Toolbar */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeFormatting('bold')}
                      title="Bold / Unbold"
                      className="px-2.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeFormatting('italic')}
                      title="Italic / Un-italicize"
                      className="px-2.5 py-0.5 text-xs italic font-serif text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeFormatting('insertUnorderedList')}
                      title="Bullet List"
                      className="px-2.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      • List
                    </button>
                  </div>
                </div>

                {/* Rich Text ContentEditable Div */}
                <div
                  ref={bioRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setFormData({ ...formData, bio: e.currentTarget.innerHTML })}
                  className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 overflow-y-auto"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>
            </>
          )}

          {/* STEP 2: WORK EXPERIENCE */}
          {step === 2 && (
            <div className="space-y-6">
              {formData.experiences.map((exp, index) => (
                <div key={index} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Experience #{index + 1}</span>
                    {formData.experiences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Job Title *</label>
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => {
                          const updated = [...formData.experiences]
                          updated[index].role = e.target.value
                          setFormData({ ...formData, experiences: updated })
                        }}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...formData.experiences]
                          updated[index].company = e.target.value
                          setFormData({ ...formData, experiences: updated })
                        }}
                        placeholder="e.g. TechCorp Solutions"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Duration</label>
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={(e) => {
                        const updated = [...formData.experiences]
                        updated[index].duration = e.target.value
                        setFormData({ ...formData, experiences: updated })
                      }}
                      placeholder="e.g. Jan 2023 - Present"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Key Achievements / Bullets</label>
                      
                      {/* Experience Formatting Toolbar */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => executeFormatting('bold')}
                          title="Bold / Unbold"
                          className="px-2.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => executeFormatting('italic')}
                          title="Italic / Un-italicize"
                          className="px-2.5 py-0.5 text-xs italic font-serif text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => executeFormatting('insertUnorderedList')}
                          title="Bullet List"
                          className="px-2.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          • List
                        </button>
                      </div>
                    </div>

                    {/* Rich Text ContentEditable Div for Bullets */}
                    <div
                      ref={(el) => { bulletRefs.current[index] = el }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => handleExperienceChange(index, 'bullets', e.currentTarget.innerHTML)}
                      className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 overflow-y-auto"
                      style={{ whiteSpace: 'pre-wrap' }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addExperience}
                className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-semibold text-xs hover:bg-indigo-50 transition-all cursor-pointer"
              >
                + Add Another Work Experience
              </button>
            </div>
          )}

          {/* STEP 3: QUALIFICATIONS */}
          {step === 3 && (
            <div className="space-y-6">
              {formData.qualifications.map((q, index) => (
                <div key={index} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Qualification #{index + 1}</span>
                    {formData.qualifications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQualification(index)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Degree / Certification *</label>
                    <input
                      type="text"
                      value={q.degree}
                      onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
                      placeholder="e.g. B.Tech. in Computer Science"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Institution / University *</label>
                      <input
                        type="text"
                        value={q.institution}
                        onChange={(e) => handleQualificationChange(index, 'institution', e.target.value)}
                        placeholder="e.g. Delhi University / IIT"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Passing Year</label>
                      <input
                        type="text"
                        value={q.year}
                        onChange={(e) => handleQualificationChange(index, 'year', e.target.value)}
                        placeholder="e.g. 2022"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addQualification}
                className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-semibold text-xs hover:bg-indigo-50 transition-all cursor-pointer"
              >
                + Add Another Qualification
              </button>
            </div>
          )}

          {/* STEP 4: SKILLS, HOBBIES & LANGUAGES */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Technical Skills (Comma Separated) *</label>
                <textarea
                  rows={3}
                  value={formData.technicalSkills}
                  onChange={(e) => setFormData({ ...formData, technicalSkills: e.target.value })}
                  placeholder="e.g. React.js, Node.js, Python, PostgreSQL, AWS..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Soft Skills</label>
                <input
                  type="text"
                  value={formData.softSkills}
                  onChange={(e) => setFormData({ ...formData, softSkills: e.target.value })}
                  placeholder="e.g. Leadership, Cross-functional Communication"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Hobbies & Interests</label>
                <input
                  type="text"
                  value={formData.hobbies}
                  onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                  placeholder="e.g. Photography, Playing Ukulele, Hiking"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Languages Known</label>
                <input
                  type="text"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  placeholder="e.g. English, Hindi"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          {step > 1 ? (
            <button
              onClick={handlePrev}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all ml-auto cursor-pointer"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all ml-auto disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Optimizing Profile...' : 'Complete & Generate ATS CV'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-[85vh] bg-slate-50 py-12 px-4 flex items-center justify-center">
      <Suspense fallback={<div className="text-center font-bold text-slate-500">Loading Onboarding Builder...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  )
}