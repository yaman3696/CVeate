import 'server-only'

import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { after, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { processPurchaseConfirmation } from '@/lib/purchase-email'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })

// Do not let an SMTP issue cause Razorpay to retry an already-fulfilled payment.
async function queueConfirmation(purchaseId: string) {
  try {
    const { error } = await supabaseAdmin.rpc(
      'cveat_queue_purchase_confirmation',
      { p_purchase_id: purchaseId }
    )

    if (error) {
      console.error('Webhook confirmation queue failed:', {
        purchaseId,
        error,
      })
      return
    }

    after(async () => {
      try {
        const result = await processPurchaseConfirmation(purchaseId)
        if (!result.success && result.status !== 'already_sent') {
          console.error('Webhook confirmation not sent:', {
            purchaseId,
            status: result.status,
          })
        }
      } catch (error) {
        console.error('Webhook confirmation processing error:', {
          purchaseId,
          error,
        })
      }
    })
  } catch (error) {
    console.error('Webhook confirmation scheduling failed:', {
      purchaseId,
      error,
    })
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature') || ''

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!webhookSecret || !keyId || !keySecret) {
      console.error('Razorpay webhook configuration missing')
      return json({ error: 'Webhook unavailable' }, 503)
    }

    const rawBody = await request.text()

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return json({ error: 'Invalid signature' }, 401)
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    const received = Buffer.from(signature, 'hex')
    const expected = Buffer.from(expectedSignature, 'hex')

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return json({ error: 'Invalid signature' }, 401)
    }

    const event = JSON.parse(rawBody)

    if (event?.event !== 'payment.captured') {
      return json({ received: true })
    }

    const paymentId = event?.payload?.payment?.entity?.id

    if (
      typeof paymentId !== 'string' ||
      !/^pay_[A-Za-z0-9]+$/.test(paymentId)
    ) {
      return json({ error: 'Invalid payment ID' }, 400)
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const payment = await razorpay.payments.fetch(paymentId)

    if (
      payment.status !== 'captured' ||
      typeof payment.order_id !== 'string' ||
      !payment.order_id
    ) {
      return json({ error: 'Payment not captured' }, 409)
    }

    const { data: purchase, error: lookupError } = await supabaseAdmin
      .from('cveate_credit_purchases')
      .select(
        'id, provider, provider_order_id, provider_payment_id, amount_paise, currency, credits, status'
      )
      .eq('provider', 'razorpay')
      .eq('provider_order_id', payment.order_id)
      .maybeSingle()

    if (lookupError) {
      console.error('Webhook purchase lookup failed:', lookupError)
      return json({ error: 'Database unavailable' }, 503)
    }

    if (!purchase) {
      console.error('Captured payment has no purchase record', {
        orderId: payment.order_id,
      })
      return json({ error: 'Purchase not found' }, 503)
    }

    if (
      Number(payment.amount) !== purchase.amount_paise ||
      payment.currency !== purchase.currency
    ) {
      console.error('Webhook payment amount mismatch', {
        purchaseId: purchase.id,
      })
      return json({ error: 'Payment mismatch' }, 409)
    }

    if (purchase.status === 'completed') {
      if (purchase.provider_payment_id !== paymentId) {
        return json({ error: 'Payment mismatch' }, 409)
      }

      await queueConfirmation(purchase.id)

      return json({ received: true, alreadyProcessed: true })
    }

    if (purchase.status !== 'created') {
      return json({ error: 'Invalid purchase status' }, 409)
    }

    const { error: grantError } = await supabaseAdmin.rpc(
      'cveat_fulfill_credit_purchase',
      {
        p_purchase_id: purchase.id,
        p_provider_payment_id: paymentId,
      }
    )

    if (grantError) {
      console.error('Webhook fulfillment failed:', grantError)
      return json({ error: 'Fulfillment pending' }, 503)
    }

    await queueConfirmation(purchase.id)

    return json({ received: true, fulfilled: true })
  } catch (error) {
    console.error('Razorpay webhook error:', error)
    return json({ error: 'Webhook processing failed' }, 500)
  }
}
