import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Helper function to handle high traffic / rate limit retries with exponential backoff
async function generateWithRetry(prompt: string, retries = 3, delay = 2000): Promise<any> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    })
    
    // Safely extract text supporting both property and fallback extraction
    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response received from Gemini model.')
    
    return text
  } catch (error: any) {
    // Check for high traffic (429) or overload (503) status codes
    const isRateLimit = error?.status === 429 || error?.status === 503 || error?.message?.includes('RESOURCE_EXHAUSTED')
    
    if (isRateLimit && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return generateWithRetry(prompt, retries - 1, delay * 2)
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { category, seniority, experience, jobDescription } = await request.json()

    const prompt = `You are an expert technical and behavioral recruiter. Generate exactly 5 interview questions for a candidate with ${experience} years of experience applying for a ${seniority} position in ${category}. 
    Target Job Description context: "${jobDescription}".
    Return ONLY a valid JSON object with a single key "questions" containing an array of 5 string questions. Do not include markdown code blocks.`

    const rawText = await generateWithRetry(prompt)
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleanedText)

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'High traffic detected. Please try again shortly.' }, { status: 500 })
  }
}