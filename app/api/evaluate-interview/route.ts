import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const isAuthorized = profile?.role === 'admin' || profile?.role === '`admin`' || profile?.plan_name === 'Daily Pass' || profile?.plan_name === 'Monthly';
        if (!isAuthorized && user.email !== process.env.NEXT_PUBLIC_OWNER_EMAIL) {
          return NextResponse.json({ error: 'Active Pass or Admin privilege required.' }, { status: 403 });
        }
      }
    }

    const { category, seniority, experience, questions, answers } = await req.json();

    if (!questions || !answers || questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing interview transcript questions or answers.' },
        { status: 400 }
      );
    }

    const prompt = `
      You are an expert recruiter and principal hiring manager. Evaluate the mock interview transcript for a ${seniority} ${category} candidate with ${experience} years of experience.

      Questions and Candidate Answers:
      ${questions.map((q: string, i: number) => `Q${i+1}:${q}\nAnswer${i+1}:${answers[i] || '[No Answer Provided]'}`).join('\n\n')}

      Task:
      Evaluate the candidate's communication clarity, technical depth, problem-solving approach, and suitability for the role.

      Provide your evaluation in strict JSON format with the following keys:
      - "overallScore": number (overall score out of 10)
      - "summary": string (comprehensive performance summary and recruiter feedback)
      - "breakdown": array of objects for each question, each having a "feedback" string explaining the evaluation of that specific answer.

      Return ONLY valid JSON without markdown formatting backticks.
    `;

    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              text: prompt,
            },
          ],
        });
        break;
      } catch (err: any) {
        if (attempts >= maxAttempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2500 * attempts));
      }
    }

    const rawText = response?.text || '{}';
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const evaluationData = JSON.parse(cleanedJson);

    return NextResponse.json(evaluationData);

  } catch (error: any) {
    console.error('Gemini Interview Evaluation Error:', error);
    return NextResponse.json(
      { error: error.message || 'AI servers are experiencing high traffic. Please try again in a few moments.' },
      { status: 500 }
    );
  }
}