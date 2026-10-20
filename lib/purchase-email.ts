import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

type EmailJob = {
  id: string
  purchase_id: string
  email_type: string
  recipient_email: string
  status: string
}

type Purchase = {
    id: string
    user_id: string
    provider: string
    provider_order_id: string
    package_name: string | null
    amount_paise: number
    currency: string
    credits: number
    status: string
  }

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paise / 100)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return replacements[character] || character
  })
}

export async function processPurchaseConfirmation(
  purchaseId: string
): Promise<{
  success: boolean
  status: string
}> {
  // 1. Find the queued confirmation email.
  const { data: job, error: jobError } = await supabaseAdmin
    .from('cveate_purchase_emails')
    .select('id, purchase_id, email_type, recipient_email, status')
    .eq('purchase_id', purchaseId)
    .eq('email_type', 'purchase_confirmation')
    .maybeSingle<EmailJob>()

  if (jobError) {
    throw new Error('Unable to load purchase email job.')
  }

  if (!job) {
    return { success: false, status: 'not_queued' }
  }

  if (job.status === 'sent') {
    return { success: true, status: 'already_sent' }
  }

  if (job.status !== 'pending') {
    return { success: false, status: job.status }
  }

  // 2. Atomically claim the email.
  const { data: claimed, error: claimError } =
    await supabaseAdmin.rpc('cveat_claim_purchase_email', {
      p_email_id: job.id,
    })

  if (claimError) {
    throw new Error('Unable to claim purchase email.')
  }

  if (claimed !== true) {
    return { success: false, status: 'already_claimed' }
  }

  try {
    // 3. Load verified purchase information.
    const { data: purchase, error: purchaseError } =
      await supabaseAdmin
        .from('cveate_credit_purchases')
        .select(
            'id, user_id, provider, provider_order_id, package_name, amount_paise, currency, credits, status'
          )
        .eq('id', purchaseId)
        .single<Purchase>()

    if (
      purchaseError ||
      !purchase ||
      purchase.status !== 'completed' ||
      purchase.provider !== 'razorpay' ||
      purchase.currency !== 'INR'
    ) {
      throw new Error('Purchase is not eligible for confirmation.')
    }

    // 4. Build the branded confirmation email.
    const amount = formatINR(purchase.amount_paise)
const packageName = purchase.package_name?.trim() || 'Career Credits'
const safePackageName = escapeHtml(packageName)
const safeAmount = escapeHtml(amount)
    const safeOrderId = escapeHtml(purchase.provider_order_id)
    const safeCredits = escapeHtml(String(purchase.credits))
    const billingUrl = 'https://cveat.in/billing'

    const text = [
      'Payment successful! 🎉',
      '',
      'Thank you for your purchase from CVeat.',
      'Your Career Credits have been added to your account and are ready to use.',
      '',
      `Package purchased: ${packageName}`,
`Career Credits added: +${purchase.credits}`,
`Amount paid: ${amount}`,
      `Razorpay order ID: ${purchase.provider_order_id}`,
      '',
      `View your payment and download your receipt: ${billingUrl}`,
      '',
      'This is a payment confirmation, not a tax invoice.',
      'Need help? Email support@cveat.in.',
      '',
      '© 2026 CVeat. All rights reserved.',
      'https://cveat.in',
    ].join('\n')

    // Table-based layout and inline styles for email client compatibility.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CVeat payment confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="background-color:#4f46e5;padding:32px 16px;">
              <span style="font-size:24px;font-weight:800;letter-spacing:-0.025em;color:#ffffff;">CVeat</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:40px 24px;color:#334155;font-size:15px;line-height:1.6;">
              <div style="font-size:38px;line-height:1;margin-bottom:16px;">🎉</div>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.025em;text-align:center;">Payment successful!</h1>
              <p style="margin:0 0 24px;text-align:center;">Thank you for choosing <strong>CVeat</strong>! Your Career Credits have been added to your account and are ready to use.</p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:20px 20px 8px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
  <td style="font-size:14px;color:#64748b;padding-bottom:14px;">Package purchased</td>
  <td align="right" style="font-size:16px;font-weight:800;color:#0f172a;padding-bottom:14px;">${safePackageName}</td>
</tr>
<tr>
  <td style="font-size:14px;color:#64748b;padding-bottom:14px;">Career Credits added</td>
  <td align="right" style="font-size:16px;font-weight:800;color:#4f46e5;padding-bottom:14px;">+${safeCredits}</td>
</tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding-bottom:14px;">Amount paid</td>
                        <td align="right" style="font-size:16px;font-weight:800;color:#0f172a;padding-bottom:14px;">${safeAmount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 20px;">
                    <div style="border-top:1px solid #e2e8f0;padding-top:14px;font-size:12px;color:#64748b;text-align:left;">
                      Razorpay order ID<br>
                      <span style="font-size:12px;color:#334155;word-break:break-all;overflow-wrap:anywhere;">${safeOrderId}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#4f46e5" style="border-radius:12px;box-shadow:0 4px 10px rgba(79,70,229,0.3);">
                   <a href="${billingUrl}" target="_blank" style="font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;border:1px solid #4f46e5;display:inline-block;">View Payment &amp; Receipt →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#64748b;text-align:center;">Need assistance? <a href="mailto:support@cveat.in" style="color:#4f46e5;text-decoration:none;">support@cveat.in</a></p>
              <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;text-align:center;">This email is a payment confirmation, not a tax invoice.</p>
              <div style="border-top:1px solid #f1f5f9;margin:30px 0 22px;width:100%;"></div>
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                &copy; 2026 CVeat. All rights reserved.<br>
                Powered by <a href="https://cveat.in" target="_blank" style="color:#4f46e5;text-decoration:none;">cveat.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    // 5. Send using the existing Hostinger SMTP service.
    const result = await sendEmail({
      to: job.recipient_email,
      subject: 'CVeat — Payment Confirmation',
      text,
      html,
    })

    if (
      !result.accepted.some(
        (address) =>
          address.toLowerCase() ===
          job.recipient_email.toLowerCase()
      )
    ) {
      throw new Error('SMTP did not accept the recipient.')
    }

    // 6. Record successful SMTP acceptance.
    const { data: finished, error: finishError } =
      await supabaseAdmin.rpc('cveat_finish_purchase_email', {
        p_email_id: job.id,
        p_success: true,
        p_error: null,
      })

    if (finishError || finished !== true) {
      console.error('Email accepted by SMTP but status update failed:', {
        purchaseId,
      })

      return { success: false, status: 'status_update_failed' }
    }

    return { success: true, status: 'sent' }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown email error'

    console.error('Purchase confirmation failed:', {
      purchaseId,
      message,
    })

    await supabaseAdmin.rpc('cveat_finish_purchase_email', {
      p_email_id: job.id,
      p_success: false,
      p_error: message,
    })

    return { success: false, status: 'failed' }
  }
}
