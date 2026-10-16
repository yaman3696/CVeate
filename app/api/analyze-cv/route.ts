import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status })

function validReport(v: any): boolean {
  return v && typeof v === 'object' && !Array.isArray(v)
    && typeof v.matchScore === 'number' && Number.isFinite(v.matchScore)
    && v.matchScore >= 0 && v.matchScore <= 100
    && ['missingKeywords', 'strengths', 'weaknesses', 'suggestions'].every(
      key => Array.isArray(v[key]) && v[key].every((x: unknown) => typeof x === 'string')
    )
    && v.extractedProfile && typeof v.extractedProfile === 'object'
    && !Array.isArray(v.extractedProfile)
}

export async function POST(req: Request) {
  let transactionId: string | null = null
  let claimed = false
  try {
    const authorization = req.headers.get('authorization') || ''
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Please sign in again.' }, 401)
    const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7))
    if (authError || !auth.user) return json({ error: 'Session expired. Please sign in again.' }, 401)

    const requestId = req.headers.get('x-ats-request-id') || ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json({ error: 'Invalid scan request ID.' }, 400)
    }

    // Check previous result BEFORE reserving or invoking Gemini.
    const lookup = async () => supabaseAdmin.rpc('get_ats_credit_transaction', {
      p_user_id: auth.user.id, p_request_id: requestId
    })
    const prior = await lookup()
    if (prior.error) throw prior.error
    const previous = prior.data?.[0]
    if (previous?.transaction_status === 'completed') {
      if (!previous.report_data) throw new Error('Saved report is missing. Please contact support.')
      return json(previous.report_data)
    }
    if (previous?.transaction_status === 'refunded') {
      return json({ error: 'This scan was refunded. Start a new scan.' }, 409)
    }
    
if (previous?.transaction_status === 'reserved') {
  // Attempt recovery only if the reservation is old enough.
  // The database function enforces the 15-minute threshold.
  const recovery = await supabaseAdmin.rpc(
    'refund_abandoned_ats_credit',
    { p_transaction_id: previous.transaction_id }
  )

  if (recovery.error) {
    console.error('ATS recovery failed:', recovery.error)
    return json(
      { error: 'Unable to verify scan status. Please retry shortly.' },
      503
    )
  }

  if (recovery.data === true) {
    return json({
      error: 'The previous scan was interrupted and its reserved credit was refunded. Please start a new scan.',
      refunded: true
    }, 409)
  }

  // A completed report may have been saved concurrently.
  const latest = await lookup()

  if (latest.error) throw latest.error

  const current = latest.data?.[0]

  if (current?.transaction_status === 'completed' && current.report_data) {
    return json(current.report_data)
  }

  if (current?.transaction_status === 'refunded') {
    return json({
      error: 'This scan was refunded. Please start a new scan.',
      refunded: true
    }, 409)
  }

  return json({
    error: 'This scan is still processing. Please retry shortly with the same request ID.',
    processing: true
  }, 202)
}


    const formData = await req.formData()
    const jobDescription = formData.get('jobDescription')
    const cvFile = formData.get('cvFile')
    if (typeof jobDescription !== 'string' || !jobDescription.trim() || jobDescription.length > 30000
      || !(cvFile instanceof File) || cvFile.size === 0 || cvFile.size > 8 * 1024 * 1024) {
      return json({ error: 'Provide a job description (up to 30,000 characters) and a CV (up to 8 MB).' }, 400)
    }
    const ext = cvFile.name.toLowerCase().split('.').pop()
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      return json({ error: 'Only PDF, DOCX and TXT files are supported.' }, 400)
    }

    const reservation = await supabaseAdmin.rpc('reserve_ats_credit', {
      p_user_id: auth.user.id, p_request_id: requestId
    })
    if (reservation.error) {
      if (reservation.error.message.includes('Insufficient Career Credits')) {
        return json({ error: 'Insufficient Career Credits', insufficientCredits: true }, 402)
      }
      throw reservation.error
    }
    transactionId = reservation.data
    const claim = await supabaseAdmin.rpc('claim_ats_processing', {
      p_transaction_id: transactionId
    })
    
    if (claim.error) throw claim.error
    
    if (!claim.data) {
      // Another request may have completed or refunded
      // this transaction while we were reserving the credit.
      const latest = await lookup()
    
      if (latest.error) throw latest.error
    
      const current = latest.data?.[0]
    
      if (current?.transaction_status === 'completed') {
        if (!current.report_data) {
          throw new Error('Saved ATS report is missing.')
        }
    
        return json(current.report_data)
      }
    
      if (current?.transaction_status === 'refunded') {
        return json({
          error: 'This scan was refunded. Please start a new scan.',
          refunded: true
        }, 409)
      }
    
      return json({
        error: 'This scan is still processing. Please retry shortly with the same request ID.',
        processing: true
      }, 202)
    }
    
    claimed = true

    const buffer = Buffer.from(await cvFile.arrayBuffer())
    const base64Data = buffer.toString('base64')
    const mimeType = ext === 'pdf' ? 'application/pdf' : ext === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain'

const prompt = `
You are an expert ATS (Applicant Tracking System) parser and senior
technical recruiter.
Analyze the attached candidate resume document against the provided
Target Job Description.
Target Job Description:
"""
${jobDescription}
"""
Task:
1. Evaluate match score, strengths, weaknesses, and actionable
suggestions.
2. Produce an "extractedProfile" containing the candidate's details
optimized for this job description.
Provide your evaluation in strict JSON format with the following keys:
- "matchScore": number (percentage between 0 and 100)
- "missingKeywords": array of strings
- "strengths": array of strings
- "weaknesses": array of strings
- "suggestions": array of strings (3 actionable bullet points)
- "extractedProfile": object containing:
- "fullName": string
- "headline": string
- "email": string
- "phone": string
- "city": string
- "state": string
- "pincode": string
- "linkedin": string
- "portfolio": string
- "bio": string
- "experiences": array of objects, each having { "role": string,
"company": string, "duration": string, "bullets": string }
- "qualifications": array of objects, each having { "degree": string,
"institution": string, "year": string }
- "technicalSkills": string
- "softSkills": string
- "hobbies": string
- "languages": string
Return ONLY valid JSON without markdown formatting backticks.
`;

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt },
          ],
        })
        break
      } catch (error: any) {
        const status = Number(error?.status ?? error?.code)
      
        // Retry only temporary Gemini errors.
        const retryable =
          status === 429 ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504
      
        if (!retryable || attempt === 3) {
          throw error
        }
      
        await new Promise(resolve =>
          setTimeout(resolve, 2500 * attempt)
        )
      }
    }
    const raw = response?.text || ''
    const result = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim())
    if (!validReport(result)) throw new Error('AI returned an incomplete ATS report.')

    const saved = await supabaseAdmin.rpc('save_ats_report_and_complete_credit', {
      p_transaction_id: transactionId, p_report_data: result
    })
    if (saved.error) throw saved.error
    return json(result)
  } catch (error: any) {
    console.error('ATS analysis failed:', error)
    if (claimed && transactionId) {
      // The completion may have committed even if its response was lost.
      // The refund RPC only refunds transactions still marked reserved.
      const refund = await supabaseAdmin.rpc('refund_career_credit', { p_transaction_id: transactionId })
      if (refund.error) console.error('ATS refund requires reconciliation:', transactionId, refund.error)
    }
    return json({ error: 'Unable to complete ATS analysis. Please retry or contact support if a credit remains reserved.' }, 500)
  }
}


export async function GET(req: Request) {
  try {
    const authorization = req.headers.get('authorization') || ''

    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Please sign in again.' },
        { status: 401 }
      )
    }

    const { data: auth, error: authError } =
      await supabaseAdmin.auth.getUser(authorization.slice(7))

    if (authError || !auth.user) {
      return NextResponse.json(
        { error: 'Session expired.' },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const requestId = url.searchParams.get('requestId') || ''

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (!uuidPattern.test(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin.rpc(
      'get_ats_credit_transaction',
      {
        p_user_id: auth.user.id,
        p_request_id: requestId
      }
    )

    if (error) throw error

    const transaction = data?.[0]

    if (!transaction) {
      return NextResponse.json(
        { error: 'Scan not found.' },
        { status: 404 }
      )
    }

    if (transaction.transaction_status === 'completed') {
      if (!transaction.report_data) {
        throw new Error('Completed scan has no saved report.')
      }

      return NextResponse.json(
        {
          status: 'completed',
          report: transaction.report_data
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    if (transaction.transaction_status === 'refunded') {
      return NextResponse.json(
        { status: 'refunded' },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { status: 'processing' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('ATS recovery lookup failed:', error)

    return NextResponse.json(
      { error: 'Unable to retrieve scan status.' },
      { status: 500 }
    )
  }
}
