import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // true for port 465
  auth: {
    user: 'support@cveat.in',
    pass: process.env.HOSTINGER_SMTP_PASSWORD,
  },
})

export async function POST(req: Request) {
  try {
    const { name, email, phone, query } = await req.json()

    if (!name || !email || !phone || !query) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    // Email sent to your support inbox
    const mailOptions = {
      from: '"CVeate Support Bot" <support@cveat.in>',
      to: 'support@cveat.in',
      replyTo: email,
      subject: `New Support Query from ${name} (${phone})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden;">
                  <tr>
                    <td align="center" style="background-color: #4f46e5; padding: 24px 0;">
                      <span style="font-size: 20px; font-weight: 800; color: #ffffff;">New Contact Form Submission</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px; color: #334155; font-size: 14px; line-height: 1.6;">
                      <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${name}</p>
                      <p style="margin: 0 0 12px 0;"><strong>Email:</strong> ${email}</p>
                      <p style="margin: 0 0 12px 0;"><strong>Phone:</strong> +91 ${phone}</p>
                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                      <p style="margin: 0 0 8px 0;"><strong>Message / Query:</strong></p>
                      <p style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 0; color: #0f172a;">${query}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Contact Email Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to send message.' }, { status: 500 })
  }
}