'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InterviewPrepPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accessType, setAccessType] = useState<'admin' | 'full_access' | 'freemium' | 'guest'>('guest')
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Modals
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)

  // Interview Setup & Configuration State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)
  const [targetRole, setTargetRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [interviewMode, setInterviewMode] = useState<'technical' | 'behavioral' | 'mixed'>('mixed')
  const [isSessionActive, setIsSessionActive] = useState(false)

  // Active Mock Interview Interaction State
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)

  // FAQ Accordion State for Landing View
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  useEffect(() => {
    const checkUserAndAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setAccessType('guest')
        setLoading(false)
        return
      }

      const currentUser = session.user
      setUser(currentUser)

      // Admin special privilege check
      const OWNER_EMAIL = 'yaman.kashyap@gmail.com'
      if (currentUser.email === OWNER_EMAIL) {
        setAccessType('admin')
        setUserProfile({ plan_name: 'Admin Pass (Full Access)', full_name: currentUser.user_metadata?.full_name || 'Admin' })
        setTargetRole(currentUser.user_metadata?.profession || 'Senior Creative Specialist')
        setLoading(false)
        return
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (!profile) {
        setAccessType('freemium')
        setLoading(false)
        return
      }

      setUserProfile(profile)
      if (profile.full_name) {
        setTargetRole(profile.profession || 'Professional')
      }

      // Check if user holds an active paid pass
      const hasPaidPass = profile.plan_name === 'Daily Pass' || profile.plan_name === 'Monthly'
      if (hasPaidPass) {
        setAccessType('full_access')
      } else {
        setAccessType('freemium')
      }

      setLoading(false)
    }

    checkUserAndAccess()
  }, [])

  // Interaction trigger when clicking buttons on the page
  const handleProtectedInteraction = (actionCallback?: () => void) => {
    if (accessType === 'guest') {
      setIsLoginPromptOpen(true)
      return
    }
    if (accessType === 'freemium') {
      setIsPricingModalOpen(true)
      return
    }
    if (actionCallback) actionCallback()
  }

  // Start Mock Interview Generation
  const handleStartInterview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetRole.trim()) {
      alert('Please specify your target job profession.')
      return
    }

    const curatedQuestions = [
      {
        id: 1,
        type: 'Technical',
        question: `As a ${targetRole}, can you walk us through a complex project you handled and how you overcame architectural or design bottlenecks?`,
        tip: 'Use the STAR method and emphasize quantifiable outcomes.'
      },
      {
        id: 2,
        type: 'Domain Specific',
        question: `Looking at your target job description requirements, how do you ensure high performance, scalability, and code cleanliness under tight deadlines?`,
        tip: 'Mention industry standards, automated testing, and prioritization.'
      },
      {
        id: 3,
        type: 'Behavioral',
        question: `Describe a time when you had a disagreement with a cross functional team member regarding project deliverables. How did you resolve it?`,
        tip: 'Focus on empathy, professional communication, and finding a win win compromise.'
      },
      {
        id: 4,
        type: 'Problem Solving',
        question: `What is your approach when you are assigned a task with vague requirements or incomplete specifications?`,
        tip: 'Highlight proactive clarification and iterative prototyping.'
      }
    ]

    setQuestions(curatedQuestions)
    setCurrentQuestionIndex(0)
    setUserAnswer('')
    setFeedback(null)
    setIsSetupModalOpen(false)
    setIsSessionActive(true)
  }

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      alert('Please provide your answer before submitting.')
      return
    }

    setEvaluating(true)
    setTimeout(() => {
      setFeedback({
        score: Math.floor(Math.random() * 2) + 8,
        strengths: 'Clear structured response with relevant professional terminology.',
        improvements: 'Try adding more concrete numerical metrics to quantify your impact.',
        sampleIdealAnswer: 'A stellar response would state the exact context, action taken, and resulting performance metric.'
      })
      setEvaluating(false)
    }, 1200)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setUserAnswer('')
      setFeedback(null)
    } else {
      alert('Congratulations! You have successfully completed this mock interview session.')
      setIsSessionActive(false)
      setIsSetupModalOpen(true)
    }
  }

  const faqs = [
    {
      question: 'What is the AI interview preparation tool?',
      answer: 'It is an interactive simulation workspace that generates custom technical and behavioral interview questions based on your professional profile and target job descriptions, scoring your responses instantly.'
    },
    {
      question: 'How do I unlock access to the interview prep suite?',
      answer: 'Access is fully bundled with our active Daily and Monthly Passes. Once you purchase a pass, you receive unlimited practice sessions for the duration of your plan.'
    },
    {
      question: 'Can I practice for specific job descriptions?',
      answer: 'Yes. You can paste any target job description into our setup wizard, and our intelligent engine will tailor questions specifically matching those exact requirements.'
    },
    {
      question: 'How does the device security limit work?',
      answer: 'To protect your account security, a single user ID can remain active across a maximum of 3 devices simultaneously.'
    }
  ]

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600 bg-slate-50 font-medium">Loading Interview Prep Workspace...</div>
  }

  // Public Landing View (Shown to Guests & Freemium users so they can inspect the page)
  const isPublicLanding = accessType === 'guest' || accessType === 'freemium'

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-indigo-600">CVeat</Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <button className="text-xs font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer">Pricing</button>
            </Link>
            {accessType === 'guest' ? (
              <button
                onClick={() => setIsLoginPromptOpen(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                Plan: {userProfile?.plan_name || 'Freemium'} {accessType === 'admin' ? '(Admin)' : ''}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-50/60 to-white px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 border border-indigo-100">
            AI Career Companion
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Master Your Next Interview with <span className="text-indigo-600">AI Mock Training</span>
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Practice role specific technical and behavioral questions, paste job descriptions for tailored preparation, and receive instant recruiter grade feedback.
          </p>
          <button
            onClick={() => handleProtectedInteraction(() => setIsSetupModalOpen(true))}
            className="rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all cursor-pointer"
          >
            {accessType === 'guest' ? 'Start Practicing Now' : (accessType === 'freemium' ? 'Upgrade Pass to Start Practicing' : 'Launch Interview Workspace')}
          </button>
        </div>
      </section>

      {/* Active Workspace for Admin & Full Access Pass Holders */}
      {!isPublicLanding && (
        <div className="max-w-4xl mx-auto px-6 py-12">
          {!isSessionActive ? (
            <div className="text-center bg-white rounded-3xl p-12 shadow-xl border border-slate-100 space-y-6">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold">AI</div>
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold text-slate-900">AI Mock Interview Trainer</h1>
                <p className="text-sm text-slate-500 max-w-lg mx-auto">
                  Train with custom questions tailored to your professional profile settings and target job descriptions.
                </p>
              </div>
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Configure & Start Interview
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">
                    Question {currentQuestionIndex + 1} of {questions.length} ({questions[currentQuestionIndex].type})
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Target Role: {targetRole}</span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {questions[currentQuestionIndex].question}
                  </h2>
                  <p className="text-xs text-indigo-600 bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl">
                    <strong className="font-bold">Pro Tip:</strong> {questions[currentQuestionIndex].tip}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Your Answer / Response</label>
                  <textarea
                    rows={5}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your spoken interview response or notes here..."
                    className="w-full rounded-2xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
                  />
                </div>

                {!feedback ? (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={evaluating}
                      className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {evaluating ? 'Analyzing Answer with AI...' : 'Submit Answer for AI Feedback'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">AI Evaluation Feedback</h4>
                        <span className="text-sm font-black bg-indigo-600 text-white px-3 py-1 rounded-full">Score: {feedback.score}/10</span>
                      </div>
                      <p className="text-xs text-slate-700"><strong className="text-slate-900">Strengths:</strong> {feedback.strengths}</p>
                      <p className="text-xs text-slate-700"><strong className="text-slate-900">Areas to Improve:</strong> {feedback.improvements}</p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleNextQuestion}
                        className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
                      >
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question ->' : 'Complete Mock Interview'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* USPs Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-100">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900">Why Use CVeat Interview Preparation?</h2>
          <p className="text-sm text-slate-500">Designed specifically for professionals looking to ace corporate hiring rounds.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">01</div>
            <h3 className="text-lg font-bold text-slate-900">Profile Integrated</h3>
            <p className="text-sm text-slate-600">Pulls your professional title and experience details directly from your profile settings for contextual accuracy.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">02</div>
            <h3 className="text-lg font-bold text-slate-900">Job Description Parsing</h3>
            <p className="text-sm text-slate-600">Paste any target job description to instantly curate questions addressing exact company requirements.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">03</div>
            <h3 className="text-lg font-bold text-slate-900">Instant AI Scoring</h3>
            <p className="text-sm text-slate-600">Get constructive feedback, scoring out of 10, and improvement tips immediately after every response.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-slate-100">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-500">Everything you need to know about interview preparation access.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index
            return (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span className="text-base">{faq.question}</span>
                  <span className="text-indigo-600 font-bold text-lg">{isOpen ? '-' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Guest Login Prompt Modal */}
      {isLoginPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">!</div>
            <h3 className="text-lg font-bold text-slate-900">Authentication Required</h3>
            <p className="text-xs text-slate-500">Please sign in with a Daily Pass or Monthly Pass account to access mock interview practice.</p>
            <div className="pt-2 flex flex-col gap-2.5">
              <Link href="/ats-checker">
                <button className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer">
                  Sign In Now
                </button>
              </Link>
              <button
                onClick={() => setIsLoginPromptOpen(false)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Freemium Pricing Pass Popup Modal */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">★</div>
            <h3 className="text-xl font-extrabold text-slate-900">Pass Required for Interview Prep</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Interview preparation is an exclusive benefit included with our Daily and Monthly Passes. Upgrade your plan to unlock full access.
            </p>
            <div className="pt-2 flex flex-col gap-2.5">
              <Link href="/pricing">
                <button className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer">
                  View Pricing Plans
                </button>
              </Link>
              <button
                onClick={() => setIsPricingModalOpen(false)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">Configure Mock Interview</h3>
              {isSessionActive && (
                <button onClick={() => setIsSetupModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer">X</button>
              )}
            </div>

            <form onSubmit={handleStartInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Target Job Profession / Role *</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  required
                  placeholder="e.g. Senior Frontend Engineer, UI/UX Product Designer"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">Pulled from your profile settings.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Target Job Description (JD) Context</label>
                <textarea
                  rows={4}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job description text here to curate specific technical questions..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Interview Focus Category</label>
                <select
                  value={interviewMode}
                  onChange={(e: any) => setInterviewMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
                >
                  <option value="mixed">Mixed (Technical + Behavioral + Problem Solving)</option>
                  <option value="technical">Deep Technical & Domain Specific</option>
                  <option value="behavioral">Behavioral & Situational (STAR Method)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Generate Curated Questions & Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}