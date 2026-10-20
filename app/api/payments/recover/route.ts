
import 'server-only'

import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })

export async function POST(request: Request) {
  try {
    // 1. Authenticate the signed-in user.
    const authorization =
      request.headers.get('authorization') || ''

    if (!authorization.startsWith('Bearer ')) {
      return json({ error: 'Please sign in first.' }, 401)
    }

    const token = authorization.slice(7).trim()

    const { data: auth, error: authError } =
      await supabaseAdmin.auth.getUser(token)

    if (authError || !auth.user) {
      return json({ error: 'Session expired.' }, 401)
    }

    // 2. Validate the purchase ID.
    const body = await request.json().catch(() => null)
    const purchaseId = body?.purchaseId

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (
      typeof purchaseId !== 'string' ||
      !uuidPattern.test(purchaseId)
    ) {
      return json({ error: 'Invalid purchase ID.' }, 400)
    }

    // 3. Find only this user's purchase.
    const { data: purchase, error: purchaseError } =
      await supabaseAdmin
        .from('cveate_credit_purchases')
        .select(
          'id, user_id, provider, provider_order_id, provider_payment_id, amount_paise, currency, credits, status'
        )
        .eq('id', purchaseId)
        .eq('user_id', auth.user.id)
        .maybeSingle()

    if (purchaseError) {
      console.error('Recovery purchase lookup failed:', purchaseError)
      return json({ error: 'Unable to load purchase.' }, 500)
    }

    if (!purchase || purchase.provider !== 'razorpay') {
      return json({ error: 'Purchase not found.' }, 404)
    }

    // Already completed purchases must never be granted again.
    if (purchase.status === 'completed') {
      return json({
        success: true,
        alreadyProcessed: true,
        credits: purchase.credits,
      })
    }

    if (purchase.status !== 'created') {
      return json({
        error: 'This purchase cannot be recovered automatically.',
      }, 409)
    }

    // 4. Verify payment directly with Razorpay.
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return json({ error: 'Payments are unavailable.' }, 503)
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const payments = await razorpay.orders.fetchPayments(
      purchase.provider_order_id
    )

    const matchingPayments = payments.items.filter(
      payment =>
        payment.order_id === purchase.provider_order_id &&
        payment.status === 'captured' &&
        Number(payment.amount) === purchase.amount_paise &&
        payment.currency === purchase.currency
    )

    if (matchingPayments.length === 0) {
      return json({
        error: 'No matching captured payment found.',
      }, 409)
    }

    if (matchingPayments.length !== 1) {
      console.error('Multiple captured payments for order', {
        purchaseId: purchase.id,
      })

      return json({
        error: 'Multiple payments require manual review.',
      }, 409)
    }

    const payment = matchingPayments[0]

    // 5. Grant credits atomically in Supabase.
    const { data: granted, error: grantError } =
      await supabaseAdmin.rpc(
        'cveat_fulfill_credit_purchase',
        {
          p_purchase_id: purchase.id,
          p_provider_payment_id: payment.id,
        }
      )

    if (grantError) {
      console.error('Payment recovery fulfillment failed:', grantError)

      return json({
        error: 'Payment confirmed, but credit recovery failed.',
      }, 503)
    }

    return json({
      success: true,
      alreadyProcessed: granted === false,
      credits: purchase.credits,
      message:
        granted === false
          ? 'Credits were already granted.'
          : 'Payment recovered and Career Credits added.',
    })
  } catch (error) {
    console.error('Payment recovery failed:', error)

    return json({
      error: 'Unable to recover payment. Please retry.',
    }, 500)
  }
}
