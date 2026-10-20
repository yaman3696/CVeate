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

// Email delivery is separate from payment fulfillment. Never let an email
// failure change the response to a successfully verified payment.
async function queueConfirmation(purchaseId: string) {
  try {
    const { error } = await supabaseAdmin.rpc(
      'cveat_queue_purchase_confirmation',
      { p_purchase_id: purchaseId }
    )

    if (error) {
      console.error('Purchase confirmation queue failed:', {
        purchaseId,
        error,
      })
      return
    }

    // Runs after the HTTP response; claim RPC prevents concurrent sends.
    after(async () => {
      try {
        const result = await processPurchaseConfirmation(purchaseId)
        if (!result.success && result.status !== 'already_sent') {
          console.error('Purchase confirmation not sent:', {
            purchaseId,
            status: result.status,
          })
        }
      } catch (error) {
        console.error('Purchase confirmation processing error:', {
          purchaseId,
          error,
        })
      }
    })
  } catch (error) {
    console.error('Purchase confirmation scheduling failed:', {
      purchaseId,
      error,
    })
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''

  try {
    if (!authorization.startsWith('Bearer ')) {
      return json({ error: 'Please sign in first.' }, 401)
    }

    const { data: auth, error: authError } =
      await supabaseAdmin.auth.getUser(authorization.slice(7).trim())

    if (authError || !auth.user) {
      return json({ error: 'Session expired.' }, 401)
    }

    const body = await request.json().catch(() => null)
    const purchaseId = body?.purchaseId
    const orderId = body?.razorpay_order_id
    const paymentId = body?.razorpay_payment_id
    const signature = body?.razorpay_signature

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (
      typeof purchaseId !== 'string' ||
      !uuidPattern.test(purchaseId) ||
      typeof orderId !== 'string' ||
      !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      typeof paymentId !== 'string' ||
      !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
      typeof signature !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(signature)
    ) {
      return json({ error: 'Invalid payment details.' }, 400)
    }

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('cveate_credit_purchases')
      .select(
        'id, user_id, provider, provider_order_id, provider_payment_id, amount_paise, currency, credits, status'
      )
      .eq('id', purchaseId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (purchaseError) {
      console.error('Purchase lookup failed:', purchaseError)
      return json({ error: 'Unable to verify purchase.' }, 500)
    }

    if (
      !purchase ||
      purchase.provider !== 'razorpay' ||
      purchase.provider_order_id !== orderId
    ) {
      return json({ error: 'Purchase not found.' }, 404)
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return json({ error: 'Payments are unavailable.' }, 503)
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${purchase.provider_order_id}|${paymentId}`)
      .digest('hex')

    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const receivedBuffer = Buffer.from(signature, 'hex')

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return json({ error: 'Payment signature verification failed.' }, 400)
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const payment = await razorpay.payments.fetch(paymentId)

    if (
      payment.order_id !== purchase.provider_order_id ||
      payment.status !== 'captured' ||
      Number(payment.amount) !== purchase.amount_paise ||
      payment.currency !== purchase.currency
    ) {
      return json({
        error: 'Payment has not been confirmed as captured.',
      }, 409)
    }

    if (purchase.status === 'completed') {
      if (purchase.provider_payment_id !== paymentId) {
        return json({ error: 'Payment mismatch.' }, 409)
      }

      await queueConfirmation(purchase.id)

      return json({
        success: true,
        alreadyProcessed: true,
        credits: purchase.credits,
      })
    }

    if (purchase.status !== 'created') {
      return json({ error: 'Purchase cannot be completed.' }, 409)
    }

    const { data: granted, error: grantError } = await supabaseAdmin.rpc(
      'cveat_fulfill_credit_purchase',
      {
        p_purchase_id: purchase.id,
        p_provider_payment_id: paymentId,
      }
    )

    if (grantError) {
      console.error('Credit fulfillment failed:', grantError)
      return json({
        error: 'Payment verified, but credits are pending. Please contact support.',
      }, 503)
    }

    await queueConfirmation(purchase.id)

    return json({
      success: true,
      alreadyProcessed: granted === false,
      credits: purchase.credits,
    })
  } catch (error) {
    console.error('Payment verification failed:', error)
    return json({ error: 'Unable to verify payment. Please retry.' }, 500)
  }
}
