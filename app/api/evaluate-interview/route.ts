import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function evaluateWithRobustRetry(prompt: string, attempt = 1): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']
  
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [prompt],
      })
      const text = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch (err: any) {
      console.warn(`Model ${model} evaluation attempt ${attempt} failed:`, err?.message)
    }
  }

  if (attempt < 4) {
    const delay = attempt * 2000
    await new Promise(resolve => setTimeout(resolve, delay))
    return evaluateWithRobustRetry(prompt, attempt + 1)
  }

  throw new Error('All AI models are currently experiencing high demand. Please try again shortly.')
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        const isAuthorized = profile?.role === 'admin' || profile?.role === '`admin`' || profile?.plan_name === 'Daily Pass' || profile?.plan_name === 'Monthly'
        if (!isAuthorized && user.email !== 'yaman.kashyap@gmail.com') {
          return NextResponse.json({ error: 'Active Pass or Admin privilege required.' }, { status: 403 })
        }
      }
    }

    const { category, seniority, experience, questions, answers } = await request.json()

    const prompt = `You are an expert recruiter. Evaluate a mock interview transcript for a ${seniority} ${category} candidate with ${experience} years experience.
    Questions and Candidate Answers:
    ${questions.map((q: string, i: number) => `Q${i+1}:${q}\nAnswer${i+1}:${answers[i]}`).join('\n\n')}

    Return ONLY a valid JSON object with:
    - "overallScore": a number out of 10
    - "summary": a detailed performance summary string
    - "breakdown": an array of objects for each question containing a "feedback" string.
    Do not include markdown code blocks.`

    const rawText = await evaluateWithRobustRetry(prompt)
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    return NextResponse.json(JSON.parse(cleanedText))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Service temporarily unavailable.' }, { status: 503 })
  }
}