import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function generateWithFallback(prompt: string, retries = 3, delay = 2000): Promise<string> {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash']
  
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [prompt],
      })
      const text = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch (error: any) {
      console.warn(`Model ${model} failed...`, error?.message)
    }
  }

  if (retries > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
    return generateWithFallback(prompt, retries - 1, delay * 2)
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

        const isAuthorized = profile?.role === 'admin' || profile?.plan_name === 'Daily Pass' || profile?.plan_name === 'Monthly'
        if (!isAuthorized && user.email !== 'yaman.kashyap@gmail.com') {
          return NextResponse.json({ error: 'Active Pass or Admin privilege required.' }, { status: 403 })
        }
      }
    }

    const { category, seniority, experience, jobDescription } = await request.json()
    const prompt = `Generate exactly 5 interview questions for a ${seniority} ${category} candidate with ${experience} years experience. Target JD: "${jobDescription}". Return ONLY a valid JSON object with key "questions" containing an array of 5 strings. No markdown code blocks.`
    
    const rawText = await generateWithFallback(prompt)
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    return NextResponse.json(JSON.parse(cleanedText))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Service temporarily unavailable.' }, { status: 503 })
  }
}