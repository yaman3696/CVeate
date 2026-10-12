import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const jobDescription = formData.get('jobDescription') as string;
    const cvFile = formData.get('cvFile') as File;

    if (!jobDescription || !cvFile) {
      return NextResponse.json(
        { error: 'Missing job description or CV file.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await cvFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = cvFile.type || 'application/pdf';

    const prompt = `
      You are an expert ATS (Applicant Tracking System) parser and senior technical recruiter.
      Analyze the attached candidate resume document against the provided Target Job Description.
      
      Target Job Description:
      """
      ${jobDescription}
      """

      Task:
      1. Evaluate match score, strengths, weaknesses, and actionable suggestions.
      2. Produce an "extractedProfile" containing the candidate's details optimized for this job description.

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
        - "experiences": array of objects, each having { "role": string, "company": string, "duration": string, "bullets": string }
        - "qualifications": array of objects, each having { "degree": string, "institution": string, "year": string }
        - "technicalSkills": string
        - "softSkills": string
        - "hobbies": string
        - "languages": string

      Return ONLY valid JSON without markdown formatting backticks.
    `;

    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash', // Updated to latest stable high-capacity model
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        });
        break;
      } catch (err: any) {
        if (attempts >= maxAttempts) throw err;
        // Wait longer on each retry for high-demand spikes to clear
        await new Promise((resolve) => setTimeout(resolve, 2500 * attempts));
      }
    }

    const rawText = response?.text || '{}';
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysisData = JSON.parse(cleanedJson);

    return NextResponse.json(analysisData);

  } catch (error: any) {
    console.error('Gemini ATS Multimodal Analysis Error:', error);
    return NextResponse.json(
      { error: error.message || 'AI servers are experiencing high traffic. Please try again in a few moments.' },
      { status: 500 }
    );
  }
}