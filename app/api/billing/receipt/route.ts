import 'server-only'
import { connection } from 'next/server'

import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { supabaseAdmin } from '@/lib/supabase-admin'

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }
const failure = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: noStore })

// Standard PDF fonts support Latin characters. Unsupported characters are
// replaced rather than allowing pdf-lib to throw and break a download.
function printable(value: unknown): string {
  const text = String(value ?? '').normalize('NFKD')
  return Array.from(text).map((char) => {
    const code = char.charCodeAt(0)
    if (code >= 32 && code <= 126) return char
    if (code >= 160 && code <= 255) return char
    if (char === '\n' || char === '\r' || char === '\t') return ' '
    return '?'
  }).join('').replace(/\s+/g, ' ').trim()
}

export async function GET(request: Request) {
await connection()
try {
    const authorization = request.headers.get('authorization') ?? ''
    if (!authorization.startsWith('Bearer ')) return failure('Please sign in first.', 401)

    const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7).trim())
    if (authError || !auth.user) return failure('Session expired. Please sign in again.', 401)

    const url = new URL(request.url)
    const purchaseId = url.searchParams.get('purchaseId') ?? ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(purchaseId)) {
      return failure('Invalid purchase ID.', 400)
    }

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('cveate_credit_purchases')
      .select('id, user_id, provider, provider_payment_id, amount_paise, currency, credits, status, created_at')
      .eq('id', purchaseId)
      .eq('user_id', auth.user.id)
      .eq('status', 'completed')
      .maybeSingle()

    if (purchaseError) throw purchaseError
    if (!purchase) return failure('Completed purchase not found.', 404)
    if (purchase.provider !== 'razorpay' || purchase.currency !== 'INR' ||
        !Number.isSafeInteger(purchase.amount_paise) || purchase.amount_paise < 0 ||
        !Number.isSafeInteger(purchase.credits) || purchase.credits <= 0) {
      return failure('Purchase details are unavailable.', 422)
    }

    const { data: billing, error: billingError } = await supabaseAdmin
      .from('cveate_purchase_billing')
      .select('user_id, billing_name, billing_email, address_line1, address_line2, city, state, postal_code, country')
      .eq('purchase_id', purchase.id)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (billingError) throw billingError
    if (!billing) return failure('Billing details are missing for this purchase.', 409)

    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595.28, 841.89]) // A4
    const regular = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const indigo = rgb(79 / 255, 70 / 255, 229 / 255)
    const ink = rgb(25 / 255, 35 / 255, 55 / 255)
    const muted = rgb(95 / 255, 105 / 255, 125 / 255)
    const width = page.getWidth()
    const margin = 48

    page.drawRectangle({ x: 0, y: 764, width, height: 78, color: indigo })
    page.drawText('CVeat', { x: margin, y: 793, size: 25, font: bold, color: rgb(1, 1, 1) })
    page.drawText('PAYMENT RECEIPT', { x: 394, y: 798, size: 11, font: bold, color: rgb(1, 1, 1) })

    const line = (y: number) => page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.7, color: rgb(0.86, 0.88, 0.92) })
    const field = (label: string, value: unknown, y: number) => {
      page.drawText(label, { x: margin, y, size: 10, font: regular, color: muted })
      const v = printable(value)
      // Keep user-controlled text inside the page.
      let shown = v
      while (shown.length && bold.widthOfTextAtSize(shown, 10) > 310) shown = shown.slice(0, -1)
      page.drawText(shown, { x: 230, y, size: 10, font: bold, color: ink })
    }

    const date = new Date(purchase.created_at)
    const purchaseDate = Number.isNaN(date.getTime()) ? 'Unavailable' :
      new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(date)
    page.drawText('Payment confirmed', { x: margin, y: 729, size: 16, font: bold, color: ink })
    page.drawText('This receipt confirms payment for CVeat Career Credits.', { x: margin, y: 707, size: 10, font: regular, color: muted })
    line(688)
    field('Date', purchaseDate, 664)
    field('Purchase', `${purchase.credits} Career Credits`, 638)
    field('Payment status', 'Paid', 612)
    field('Amount paid', `INR ${(purchase.amount_paise / 100).toFixed(2)}`, 586)
    line(567)

    page.drawText('BILLED TO', { x: margin, y: 542, size: 11, font: bold, color: indigo })
    const address = [billing.address_line1, billing.address_line2, billing.city, billing.state, billing.postal_code, billing.country]
      .map(printable).filter(Boolean)
    field('Name', billing.billing_name, 515)
    field('Email', billing.billing_email, 489)
    // Split address into safe-sized lines to avoid overflowing the page.
    let addressY = 463
    for (const part of address) {
      let remaining = part
      while (remaining && addressY >= 330) {
        let segment = remaining
        while (segment.length && regular.widthOfTextAtSize(segment, 10) > 310) segment = segment.slice(0, -1)
        if (!segment) break
        page.drawText(segment, { x: 230, y: addressY, size: 10, font: regular, color: ink })
        remaining = remaining.slice(segment.length)
        addressY -= 17
      }
    }
    line(309)
    page.drawText('TRANSACTION DETAILS', { x: margin, y: 284, size: 11, font: bold, color: indigo })
    field('Payment reference', purchase.provider_payment_id || 'Unavailable', 257)
    field('Purchase ID', purchase.id, 231)
    line(208)

    page.drawText('CVeat is not GST registered. GST has not been charged separately.', {
      x: margin, y: 180, size: 9, font: regular, color: muted,
    })
    page.drawText('This is a payment receipt, not a GST tax invoice.', {
      x: margin, y: 164, size: 9, font: regular, color: muted,
    })
    page.drawText('For billing assistance: support@cveat.in', {
      x: margin, y: 130, size: 9, font: regular, color: muted,
    })

    const bytes = await pdf.save()
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        ...noStore,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CVeat-receipt-${purchase.id}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Receipt download failed:', error)
    return failure('Unable to generate receipt. Please try again.', 500)
  }
}
