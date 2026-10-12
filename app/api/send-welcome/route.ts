import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Step 3: Configure transporter using Port 587 (TLS) for cloud hosting reliability
const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // true for port 465
    auth: {
      user: 'support@cveate.in',
      pass: process.env.HOSTINGER_SMTP_PASSWORD,
    },
  })
  
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const record = body.record 

    if (!record || !record.email) {
      return NextResponse.json({ error: 'No user record found' }, { status: 400 })
    }

    const userName = record.full_name || 'Professional'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden;">
                <tr>
                  <td align="center" style="background-color: #4f46e5; padding: 32px 0;">
                    <span style="font-size: 24px; font-weight: 800; color: #ffffff;">CV<span style="color: #c7d2fe;">eate</span></span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px; color: #334155; font-size: 15px; line-height: 1.6;">
                    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0f172a; text-align: center;">Welcome to CVeat, ${userName}! 🎉</h1>
                    <p style="text-align: center;">Your email is verified and your account is ready. You can now build strict ATS-compliant resumes and check your match scores instantly.</p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="https://cveat.in/dashboard" target="_blank" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: '"CVeat Team" <support@cveat.in>',
      to: record.email,
      subject: 'Welcome to CVeat! Let’s build your resume 🚀',
      html: htmlContent,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Step 4: Add detailed error logging for debugging
    console.error('Nodemailer Error Details:', err)
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 })
  }
}