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

    const { category, seniority, experience, jobDescription } = await req.json();

    if (!category || !seniority || !experience) {
      return NextResponse.json(
        { error: 'Missing required interview configuration fields.' },
        { status: 400 }
      );
    }

    const prompt = `
      You are a strict, expert technical hiring manager and principal recruiter.
      Generate exactly 5 highly customized interview questions tailored specifically for:
      - Profession Field: ${category}
      - Seniority Tier: ${seniority}
      - Exact Years of Experience: ${experience}
      - Target Job Description: "${jobDescription || 'General industry standard expectations'}"

      CRITICAL INSTRUCTIONS:
      1. If the seniority is 'Internship' or 'Junior', focus on foundational concepts, problem-solving basics, and learning potential.
      2. If the seniority is 'Senior', 'Team Lead', 'Manager', or 'HOD', focus heavily on architecture, leadership, scaling, system design, and strategic decision-making.
      3. Ensure the questions deeply incorporate the specific nuances of the target Job Description provided above.

      Provide your evaluation in strict JSON format with the following key:
      - "questions": array of exactly 5 distinct strings.

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
    const resultData = JSON.parse(cleanedJson);

    return NextResponse.json(resultData);

  } catch (error: any) {
    console.error('Gemini Interview Generation Error:', error);
    return NextResponse.json(
      { error: error.message || 'AI servers are experiencing high traffic. Please try again in a few moments.' },
      { status: 500 }
    );
  }
}