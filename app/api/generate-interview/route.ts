import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function generateWithRetry(prompt: string, retries = 3, delay = 2000): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt],
    })
    const text = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from model.')
    return text
  } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return generateWithRetry(prompt, retries - 1, delay * 2)
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { category, seniority, experience, jobDescription } = await request.json()
    const prompt = `You are an expert recruiter. Generate exactly 5 interview questions for a ${seniority} ${category} candidate with ${experience} years experience. Target JD: "${jobDescription}". Return ONLY a valid JSON object with key "questions" containing an array of 5 strings. No markdown code blocks.`
    
    const rawText = await generateWithRetry(prompt)
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    return NextResponse.json(JSON.parse(cleanedText))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'High traffic detected. Please try again shortly.' }, { status: 500 })
  }
}