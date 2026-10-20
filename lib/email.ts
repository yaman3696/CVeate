
import 'server-only'

import nodemailer from 'nodemailer'

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || 465)
const smtpUser = process.env.SMTP_USER
const smtpPassword = process.env.HOSTINGER_SMTP_PASSWORD
const smtpFrom = process.env.SMTP_FROM || smtpUser

function getTransporter() {
  if (
    !smtpHost ||
    !smtpUser ||
    !smtpPassword ||
    !smtpFrom ||
    !Number.isInteger(smtpPort) ||
    smtpPort < 1 ||
    smtpPort > 65535
  ) {
    throw new Error('Hostinger SMTP configuration is incomplete.')
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  })
}

export async function verifyEmailConnection() {
  const transporter = getTransporter()

  try {
    await transporter.verify()
    return true
  } finally {
    transporter.close()
  }
}

type SendEmailOptions = {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: SendEmailOptions) {
  const transporter = getTransporter()

  try {
    const result = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text,
      html,
      attachments,
    })

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    }
  } finally {
    transporter.close()
  }
}
