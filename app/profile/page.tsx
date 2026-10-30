'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    address: '',
    gender: 'Male',
    birthdate: '',
    profession: '',
    currentPosition: '',
    careerStatus: 'Professional',
    totalExperienceYears: '0',
    totalExperienceMonths: '0',
    noticePeriod: 'Immediate',
    currentCtc: '',
    expectedCtc: ''
  })

  // Fetch profile data from Supabase on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Please sign in to load your profile.')

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name,contact_number,phone,address_line_1,gender,birthdate,profession,target_job_title,current_job_title,career_status,total_experience_years,total_experience_months,notice_period,current_ctc,expected_ctc')
          .eq('id', user.id)
          .single()

        if (error) throw error
        if (!data) throw new Error('Your profile could not be found. Please contact support.')
        if (data) {
          setFormData({
            fullName: data.full_name || user.user_metadata?.full_name || '',
            contactNumber: data.contact_number || data.phone || user.user_metadata?.contact_number || '',
            address: data.address_line_1 || '',
            gender: data.gender || 'Male',
            birthdate: data.birthdate || '',
            profession: data.profession || data.target_job_title || '',
            currentPosition: data.current_job_title || '',
            careerStatus: data.career_status || 'Professional',
            totalExperienceYears: data.total_experience_years?.toString() || '0',
            totalExperienceMonths: data.total_experience_months?.toString() || '0',
            noticePeriod: data.notice_period || 'Immediate',
            currentCtc: data.current_ctc?.toString() || '',
            expectedCtc: data.expected_ctc?.toString() || ''
          })
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        setLoadFailed(true)
        setMessage({text: err instanceof Error ? err.message : 'Could not load your profile. Please retry.',type:'error'})
      } finally {
        setLoading(false)
      }
    }

    if (new URLSearchParams(window.location.search).get('complete') === '1') setIsEditing(true)
    fetchProfile()
  }, [])

  // Handle saving profile changes to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No active user found.')

        const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          contact_number: formData.contactNumber,
          phone: formData.contactNumber,
          address_line_1: formData.address,
          gender: formData.gender,
          birthdate: formData.birthdate || null,
          profession: formData.profession,
          current_job_title: formData.currentPosition,
          career_status: formData.careerStatus,
          total_experience_years: parseInt(formData.totalExperienceYears) || 0,
          total_experience_months: parseInt(formData.totalExperienceMonths) || 0,
          notice_period: formData.noticePeriod,
          current_ctc: formData.currentCtc
            ? parseFloat(formData.currentCtc)
            : null,
          expected_ctc: formData.expectedCtc
            ? parseFloat(formData.expectedCtc)
            : null,
        })
        .eq('id', user.id)
        .select('id')
        .single()
      
      if (error) throw error
      
      if (!updatedProfile) {
        throw new Error('Profile not found. Please sign in again.')
      }

      window.dispatchEvent(new Event('cveat-profile-updated'))
      setMessage({ text: 'Profile settings updated and saved successfully!', type: 'success' })
      setIsEditing(false)
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save profile settings.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-medium pt-6 dark:bg-[#0B1120] dark:text-slate-400">
        Loading profile...
      </div>
    )
  }

  if (loadFailed) return <main className="min-h-screen bg-slate-50 p-8 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100"><h1 className="text-2xl font-bold">Could not load your profile</h1><p role="alert" className="my-4">{message.text}</p><button onClick={() => window.location.reload()} className="rounded-xl bg-indigo-600 px-5 py-3 text-white">Retry loading profile</button></main>
  return (
    <div className="min-h-screen bg-slate-50 pt-12 pb-16 px-6 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      <div className="mx-auto max-w-3xl w-full space-y-6">
        
        {/* Header with Edit Toggle Button */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2">Profile Settings</h1>
            <p className="text-xs text-slate-600 mt-1 dark:text-slate-300">Manage your personal credentials, contact details, and career preferences.</p>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer dark:shadow-black/20"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm dark:bg-[#1B263B] dark:border-slate-700 dark:shadow-black/15">
          {message.text && (
            <div className={`mb-6 rounded-xl p-3 text-xs font-semibold border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-emerald-400/10 dark:border-emerald-400/25 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-400/10 dark:border-red-400/25 dark:text-red-300'}`}>
              {message.text}
            </div>
          )}

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700/70">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Full Name</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.fullName || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Contact Number</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.contactNumber || 'Not specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700/70">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Gender</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.gender || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Birthdate</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.birthdate || 'Not specified'}</p>
                </div>
              </div>

              <div className="pb-6 border-b border-slate-100 dark:border-slate-700/70">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Residential Address</span>
                <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.address || 'Not specified'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700/70">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Current Position / Job Title</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.currentPosition || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Profession / Target Role</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.profession || 'Not specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700/70">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Career Status</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.careerStatus || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Work Experience</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.totalExperienceYears} Yrs {formData.totalExperienceMonths} Mos</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Notice Period</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.noticePeriod}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Current CTC</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.currentCtc ? `₹ ${formData.currentCtc} LPA` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Expected CTC</span>
                  <p className="font-semibold text-slate-800 mt-1 dark:text-slate-100">{formData.expectedCtc ? `₹ ${formData.expectedCtc} LPA` : 'Not specified'}</p>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Contact Number</label>
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Birthdate</label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Current Position / Title</label>
                  <input
                    type="text"
                    value={formData.currentPosition}
                    onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                    placeholder="e.g. Senior Creative Designer"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Target Profession / Role</label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g. Lead Product Designer"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Career Status</label>
                  <select
                    value={formData.careerStatus}
                    onChange={(e) => setFormData({ ...formData, careerStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  >
                    <option value="Professional">Experienced Professional</option>
                    <option value="Fresher">Fresher / Graduate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Total Experience</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.totalExperienceYears}
                      onChange={(e) => setFormData({ ...formData, totalExperienceYears: e.target.value })}
                      className="rounded-xl border border-slate-200 px-2 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                    >
                      {[...Array(25)].map((_, i) => (
                        <option key={i} value={i}>{i} Yrs</option>
                      ))}
                    </select>
                    <select
                      value={formData.totalExperienceMonths}
                      onChange={(e) => setFormData({ ...formData, totalExperienceMonths: e.target.value })}
                      className="rounded-xl border border-slate-200 px-2 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i} value={i}>{i} Mos</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Notice Period</label>
                  <select
                    value={formData.noticePeriod}
                    onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  >
                    <option value="Immediate">Immediate Joiner</option>
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">60 Days</option>
                    <option value="90 Days">90 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Current CTC (INR)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.currentCtc}
                    onChange={(e) => setFormData({ ...formData, currentCtc: e.target.value })}
                    placeholder="e.g. 12.5"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300">Expected CTC (INR)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.expectedCtc}
                    onChange={(e) => setFormData({ ...formData, expectedCtc: e.target.value })}
                    placeholder="e.g. 18.0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 dark:border-slate-700 dark:focus:ring-indigo-400 dark:bg-[#111C30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 dark:shadow-black/20"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#26344D]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}