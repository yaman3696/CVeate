import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function evaluateWithRetry(contents: any[], retries = 3, delay = 2000): Promise<any> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
    })
    
    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response received from Gemini model.')
    
    return text
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.status === 503 || error?.message?.includes('RESOURCE_EXHAUSTED')
    
    if (isRateLimit && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return evaluateWithRetry(contents, retries - 1, delay * 2)
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { category, seniority, experience, questions, answers, audioRecordings } = await request.json()

    // Construct multimodal content parts for Gemini
    const contentParts: any[] = [
      {
        text: `You are an expert recruiter and vocal coach. Evaluate this mock interview for a ${seniority} ${category} candidate with ${experience} years experience. Analyze both the text transcript and the candidate's vocal confidence, tone, and delivery from the provided audio recordings where available.
        
        Questions and Responses:`
      }
    ]

    questions.forEach((q: string, i: number) => {
      contentParts.push({ text: `\nQ${i+1}: ${q}\nText Answer: ${answers[i] || '[Voice Answer]'}` })
      
      // If audio recording exists for this question, attach it as inline audio data
      if (audioRecordings && audioRecordings[i]) {
        contentParts.push({
          inlineData: {
            mimeType: 'audio/webm',
            data: audioRecordings[i] // base64 string
          }
        })
      }
    })

    contentParts.push({
      text: `\nReturn ONLY a valid JSON object with:
      - "overallScore": a number out of 10
      - "summary": a detailed performance summary string covering both technical depth and vocal confidence/tone
      - "breakdown": an array of objects for each question containing a "feedback" string.
      Do not include markdown code blocks.`
    })

    const rawText = await evaluateWithRetry(contentParts)
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleanedText)

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'High traffic detected. Please try again shortly.' }, { status: 500 })
  }
}