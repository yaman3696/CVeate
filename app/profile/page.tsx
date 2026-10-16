'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    panNumber: '',
    currentCtc: '',
    expectedCtc: ''
  })

  // Fetch profile data from Supabase on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setFormData({
            fullName: data.full_name || data.first_name || user.user_metadata?.full_name || '',
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
            panNumber: data.pan_number || '',
            currentCtc: data.current_ctc?.toString() || '',
            expectedCtc: data.expected_ctc?.toString() || ''
          })
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }

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
          pan_number: formData.panNumber || null,
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-medium pt-6">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-12 pb-16 px-6 text-slate-900">
      <div className="mx-auto max-w-3xl w-full space-y-6">
        
        {/* Header with Edit Toggle Button */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2">Profile Settings</h1>
            <p className="text-xs text-slate-600 mt-1">Manage your personal credentials, contact details, and career preferences.</p>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm">
          {message.text && (
            <div className={`mb-6 rounded-xl p-3 text-xs font-semibold border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {message.text}
            </div>
          )}

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.fullName || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact Number</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.contactNumber || 'Not specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Gender</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.gender || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Birthdate</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.birthdate || 'Not specified'}</p>
                </div>
              </div>

              <div className="pb-6 border-b border-slate-100">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Residential Address</span>
                <p className="font-semibold text-slate-800 mt-1">{formData.address || 'Not specified'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Position / Job Title</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.currentPosition || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Profession / Target Role</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.profession || 'Not specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Career Status</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.careerStatus || 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Work Experience</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.totalExperienceYears} Yrs {formData.totalExperienceMonths} Mos</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Notice Period</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.noticePeriod}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">PAN Number</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.panNumber ? '••••••••' + formData.panNumber.slice(-4) : 'Skipped'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Current CTC</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.currentCtc ? `₹ ${formData.currentCtc} LPA` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Expected CTC</span>
                  <p className="font-semibold text-slate-800 mt-1">{formData.expectedCtc ? `₹ ${formData.expectedCtc} LPA` : 'Not specified'}</p>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Contact Number</label>
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Birthdate</label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Current Position / Title</label>
                  <input
                    type="text"
                    value={formData.currentPosition}
                    onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                    placeholder="e.g. Senior Creative Designer"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Target Profession / Role</label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g. Lead Product Designer"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Career Status</label>
                  <select
                    value={formData.careerStatus}
                    onChange={(e) => setFormData({ ...formData, careerStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer"
                  >
                    <option value="Professional">Experienced Professional</option>
                    <option value="Fresher">Fresher / Graduate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Total Experience</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.totalExperienceYears}
                      onChange={(e) => setFormData({ ...formData, totalExperienceYears: e.target.value })}
                      className="rounded-xl border border-slate-200 px-2 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer"
                    >
                      {[...Array(25)].map((_, i) => (
                        <option key={i} value={i}>{i} Yrs</option>
                      ))}
                    </select>
                    <select
                      value={formData.totalExperienceMonths}
                      onChange={(e) => setFormData({ ...formData, totalExperienceMonths: e.target.value })}
                      className="rounded-xl border border-slate-200 px-2 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i} value={i}>{i} Mos</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Notice Period</label>
                  <select
                    value={formData.noticePeriod}
                    onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 cursor-pointer"
                  >
                    <option value="Immediate">Immediate Joiner</option>
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">60 Days</option>
                    <option value="90 Days">90 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">PAN Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Current CTC (INR)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.currentCtc}
                    onChange={(e) => setFormData({ ...formData, currentCtc: e.target.value })}
                    placeholder="e.g. 12.5"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Expected CTC (INR)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.expectedCtc}
                    onChange={(e) => setFormData({ ...formData, expectedCtc: e.target.value })}
                    placeholder="e.g. 18.0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
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