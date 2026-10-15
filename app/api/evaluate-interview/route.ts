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

    const { category, seniority, questions, answers } = await req.json();

    if (!questions || !answers || questions.length === 0) {
      return NextResponse.json({ error: 'Missing assessment questions or answers.' }, { status: 400 });
    }

    const prompt = `
      You are an expert technical recruiter, hiring manager, and principal interviewer. 
      Evaluate the timed assessment responses for a candidate applying for a **${seniority}** position in **${category}**.

      Assessment Questions and Candidate Answers:
      ${questions.map((q: string, i: number) => `Q${i+1}:${q}\nAnswer${i+1}:${answers[i] || '[No Answer Provided]'}`).join('\n\n')}

      Evaluation Guidelines:
      1. Assess technical accuracy, problem-solving depth, structural clarity, and relevance to the ${seniority} level expectations.
      2. If an answer is marked as '[Skipped]' or '[No Answer Provided]', score it accordingly and provide constructive advice on what should have been covered.
      3. Be rigorous yet constructive.

      Provide your evaluation in strict JSON format with the following exact keys:
      - "overallScore": number (overall score out of 10, rounded to one decimal place)
      - "summary": string (comprehensive performance summary, highlighting core strengths and areas for improvement)
      - "breakdown": array of objects for each question index, each having a "feedback" string explaining the evaluation, critique, and ideal approach for that specific question.

      Return ONLY valid JSON without markdown formatting backticks.
    `;

    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'models/gemini-3.8-flash',
          contents: [{ text: prompt }],
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
    console.error('Gemini Assessment Evaluation Error:', error);
    return NextResponse.json(
      { error: error.message || 'AI servers are experiencing high traffic. Please try again in a few moments.' },
      { status: 500 }
    );
  }
}