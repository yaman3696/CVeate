
import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })

async function authenticate(req: Request) {
  const header = req.headers.get('authorization') || ''

  if (!header.startsWith('Bearer ')) {
    return null
  }

  const { data, error } = await supabaseAdmin.auth.getUser(
    header.slice(7).trim()
  )

  if (error || !data.user) {
    return null
  }

  return data.user
}

function validEvaluation(value: any): boolean {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.overallScore === 'number' &&
    Number.isFinite(value.overallScore) &&
    value.overallScore >= 0 &&
    value.overallScore <= 10 &&
    typeof value.summary === 'string' &&
    Array.isArray(value.breakdown) &&
    value.breakdown.every(
      (item: any) =>
        item &&
        typeof item === 'object' &&
        typeof item.feedback === 'string'
    )
  )
}

async function getJob(userId: string, requestId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    'get_interview_evaluation_job',
    {
      p_user_id: userId,
      p_request_id: requestId,
    }
  )

  if (error) throw error

  return data?.[0] || null
}

function jobResponse(job: any) {
  if (!job) {
    return json({ error: 'Interview evaluation not found.' }, 404)
  }

  if (job.job_status === 'completed') {
    if (!job.job_report) {
      return json({ error: 'Evaluation report is unavailable.' }, 500)
    }

    return json({
      status: 'completed',
      report: job.job_report,
    })
  }

  if (job.job_status === 'refunded') {
    return json({
      status: 'refunded',
      error:
        'This evaluation was interrupted or failed. Its reserved credit was refunded.',
    }, 409)
  }

  return json({
    status: 'processing',
    processing: true,
  }, 202)
}

export async function GET(req: Request) {
  try {
    const user = await authenticate(req)

    if (!user) {
      return json({ error: 'Please sign in again.' }, 401)
    }

    const requestId =
      new URL(req.url).searchParams.get('requestId') || ''

    if (!UUID_PATTERN.test(requestId)) {
      return json({ error: 'Invalid interview request ID.' }, 400)
    }

    const job = await getJob(user.id, requestId)

    if (
      job &&
      (job.job_status === 'pending' ||
        job.job_status === 'processing')
    ) {
      const { error: recoveryError } = await supabaseAdmin.rpc(
        'refund_interview_evaluation_job',
        {
          p_user_id: user.id,
          p_request_id: requestId,
          p_abandoned_only: true,
        }
      )

      if (recoveryError) {
        console.error('Interview recovery check failed:', recoveryError)
        return json({
          error: 'Unable to verify evaluation status. Please retry.',
        }, 503)
      }

      return jobResponse(await getJob(user.id, requestId))
    }

    return jobResponse(job)
  } catch (error) {
    console.error('Interview recovery error:', error)

    return json({
      error: 'Unable to retrieve interview evaluation.',
    }, 500)
  }
}

export async function POST(req: Request) {
  let userId: string | null = null
  let requestId: string | null = null
  let claimed = false

  try {
    const user = await authenticate(req)

    if (!user) {
      return json({ error: 'Please sign in again.' }, 401)
    }

    userId = user.id

    const body = await req.json()

    requestId = body.requestId

    if (
      typeof requestId !== 'string' ||
      !UUID_PATTERN.test(requestId)
    ) {
      return json({
        error: 'Invalid interview request ID.',
      }, 400)
    }

    // Check an existing request before reserving a credit.
    const existing = await getJob(user.id, requestId)

    if (existing) {
      return jobResponse(existing)
    }

    const { category, seniority, questions, answers } = body

    if (
      typeof category !== 'string' ||
      !category.trim() ||
      category.length > 200 ||
      typeof seniority !== 'string' ||
      !seniority.trim() ||
      seniority.length > 200 ||
      !Array.isArray(questions) ||
      !Array.isArray(answers) ||
      questions.length === 0 ||
      questions.length > 30 ||
      questions.length !== answers.length ||
      !questions.every(
        (q: unknown) =>
          typeof q === 'string' && q.length <= 3000
      ) ||
      !answers.every(
        (a: unknown) =>
          typeof a === 'string' && a.length <= 10000
      )
    ) {
      return json({
        error: 'Missing or invalid interview questions or answers.',
      }, 400)
    }

    // This database function reserves the credit and creates
    // the job atomically. Repeated request IDs do not charge twice.
    const { data: created, error: creationError } =
      await supabaseAdmin.rpc(
        'create_interview_evaluation_job',
        {
          p_user_id: user.id,
          p_request_id: requestId,
          p_category: category,
          p_seniority: seniority,
          p_questions: questions,
          p_answers: answers,
        }
      )

    if (creationError) {
      console.error('Interview reservation failed:', creationError)

      if (
        creationError.message.includes(
          'Insufficient Career Credits'
        )
      ) {
        return json({
          error: 'Insufficient Career Credits.',
          insufficientCredits: true,
        }, 402)
      }

      return json({
        error: 'Unable to start interview evaluation.',
      }, 500)
    }

    const createdJob = created?.[0]

    if (!createdJob) {
      throw new Error('Interview evaluation job was not created.')
    }

    if (createdJob.job_status === 'completed') {
      return json({
        status: 'completed',
        report: createdJob.job_report,
      })
    }

    if (createdJob.job_status === 'refunded') {
      return json({
        status: 'refunded',
        error: 'This evaluation has already been refunded.',
      }, 409)
    }

    // Only one server request may start Gemini.
    const { data: claimResult, error: claimError } =
      await supabaseAdmin.rpc(
        'claim_interview_evaluation_job',
        {
          p_user_id: user.id,
          p_request_id: requestId,
        }
      )

    if (claimError) throw claimError

    if (claimResult !== true) {
      return jobResponse(await getJob(user.id, requestId))
    }

    claimed = true

    const prompt = `
You are an expert technical recruiter, hiring manager,
and principal interviewer.

Evaluate the timed assessment responses for a candidate
applying for a ${seniority} position in ${category}.

Assessment Questions and Candidate Answers:

${questions
  .map(
    (q: string, i: number) =>
      `Q${i + 1}: ${q}
Answer${i + 1}: ${answers[i] || '[No Answer Provided]'}`
  )
  .join('\n\n')}

Evaluation Guidelines:
1. Assess technical accuracy, problem-solving depth,
structural clarity, and relevance to the ${seniority}
level expectations.
2. If an answer is marked as '[Skipped]' or
'[No Answer Provided]', score it accordingly and provide
constructive advice on what should have been covered.
3. Be rigorous yet constructive.

Provide your evaluation in strict JSON format with:
- "overallScore": number from 0 to 10, rounded to one decimal
- "summary": string
- "breakdown": array containing one object per question,
  each with a "feedback" string

Return ONLY valid JSON without markdown backticks.
`

    let response:
      | Awaited<ReturnType<typeof ai.models.generateContent>>
      | undefined

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'models/gemini-3.8-flash',
          contents: [{ text: prompt }],
        })
        break
      } catch (error: any) {
        const status = Number(error?.status ?? error?.code)

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

    const rawText = response?.text || ''

    const cleanedJson = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const evaluation = JSON.parse(cleanedJson)

    if (!validEvaluation(evaluation)) {
      throw new Error('Gemini returned an incomplete evaluation.')
    }

    // Save temporary report and complete credit together.
    const { data: completed, error: completionError } =
      await supabaseAdmin.rpc(
        'complete_interview_evaluation_job',
        {
          p_user_id: user.id,
          p_request_id: requestId,
          p_report_data: evaluation,
        }
      )

      if (completionError || completed !== true) {
        console.error(
          'Interview completion failed:',
          completionError
        )

        // Another request may have completed or refunded this job.
        // Check the authoritative database status before proceeding.
        const currentJob = await getJob(user.id, requestId)

        if (
          currentJob?.job_status === 'completed' &&
          currentJob.job_report
        ) {
          return json({
            status: 'completed',
            report: currentJob.job_report,
          })
        }

        if (currentJob?.job_status === 'refunded') {
          return json(
            {
              status: 'refunded',
              error:
                'This evaluation was interrupted and its reserved Career Credit was refunded.',
            },
            409
          )
        }

        throw new Error(
          'Unable to complete interview evaluation.'
        )
      }

    return json({
      status: 'completed',
      report: evaluation,
    })
  } catch (error) {
    console.error('Interview evaluation error:', error)

    if (claimed && userId && requestId) {
        const { data: refunded, error: refundError } =
        await supabaseAdmin.rpc(
          'refund_interview_evaluation_job',
          {
            p_user_id: userId,
            p_request_id: requestId,
            p_abandoned_only: false,
          }
        )

      if (refundError) {
        console.error(
          'Interview credit refund requires review:',
          refundError
        )
      } else if (refunded !== true) {
        console.warn(
          'Interview refund not performed; job may already be completed or refunded.',
          { requestId }
        )
      }

      if (refundError) {
        console.error(
          'Interview credit refund requires review:',
          refundError
        )
      }
    }

    return json({
      error:
        'Unable to evaluate the interview. If a credit was reserved, it will be refunded when the failed request is reconciled.',
    }, 500)
  }
}
