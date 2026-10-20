import 'server-only'
import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
const json = (body: unknown, status = 200) =>
NextResponse.json(body, {
status,
headers: { 'Cache-Control': 'no-store' },
})
type BillingDetails = { billing_name: string; billing_email: string; address_line1: string; address_line2: string; city: string; state: string; postal_code: string; country: 'IN' }
function validateBilling(value: unknown): BillingDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const f = (key: string) => typeof input[key] === 'string' ? (input[key] as string).trim() : ''
  const billing_name = f('billing_name'), billing_email = f('billing_email'), address_line1 = f('address_line1'), address_line2 = f('address_line2'), city = f('city'), state = f('state'), postal_code = f('postal_code')
  if (billing_name.length < 2 || billing_name.length > 150 || billing_email.length < 3 || billing_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing_email) || address_line1.length < 3 || address_line1.length > 250 || address_line2.length > 250 || city.length < 2 || city.length > 100 || state.length < 2 || state.length > 100 || !/^[0-9]{6}$/.test(postal_code) || (f('country') !== 'IN')) return null
  return { billing_name, billing_email, address_line1, address_line2, city, state, postal_code, country: 'IN' }
}
export async function POST(request: Request) {
const authorization =
request.headers.get('authorization') || ''
try {
// 1. Authenticate the actual Supabase user.
if (!authorization.startsWith('Bearer ')) {
return json({ error: 'Please sign in first.' }, 401)
}
const token = authorization.slice(7).trim()
const { data: auth, error: authError } =
await supabaseAdmin.auth.getUser(token)
if (authError || !auth.user) {
return json({ error: 'Session expired.' }, 401)
}
// 2. Accept only the package identifier.
// Never accept price or credits from the browser.
const body = await request.json().catch(() => null)
const packageKey = body?.packageKey
const billing = validateBilling(body?.billing)
if (!billing) return json({ error: 'Please provide valid Indian billing details.' }, 400)
if (
typeof packageKey !== 'string' ||
!/^[a-z0-9_]{1,50}$/.test(packageKey)
) {
return json({ error: 'Invalid package.' }, 400)
}
// 3. Read the authoritative price from Supabase.
const { data: creditPackage, error: packageError } =
await supabaseAdmin
.from('cveate_credit_packages')
.select(
'id, package_key, name, price_paise, credits, currency, is_active'
)
.eq('package_key', packageKey)
.maybeSingle()
if (packageError) {
console.error('Package lookup failed:', packageError)
return json({ error: 'Unable to load package.' }, 500)
}
if (!creditPackage || !creditPackage.is_active) {
return json({
error: 'This package is not available for purchase.',
}, 409)
}
if (
!Number.isSafeInteger(creditPackage.price_paise) ||
creditPackage.price_paise <= 0 ||
!Number.isSafeInteger(creditPackage.credits) ||
creditPackage.credits <= 0 ||
creditPackage.currency !== 'INR'
) {
return json({ error: 'Invalid package configuration.' }, 500)
}
// 4. Use Razorpay server-side credentials.
const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET
if (!keyId || !keySecret) {
console.error('Razorpay credentials missing')
return json({ error: 'Payments are unavailable.' }, 503)
}
const razorpay = new Razorpay({
key_id: keyId,
key_secret: keySecret,
})
// 5. Create a Razorpay order.
const receipt = `cv_${crypto.randomUUID()}`
const order = await razorpay.orders.create({
amount: creditPackage.price_paise,
currency: 'INR',
receipt,
notes: {
package_key: creditPackage.package_key,
user_id: auth.user.id,
},
})
// 6. Save the order in Supabase.
// Status remains 'created': no credits are granted.
const { data: purchase, error: purchaseError } =
await supabaseAdmin
.from('cveate_credit_purchases')
.insert({
user_id: auth.user.id,
provider: 'razorpay',
provider_order_id: order.id,
amount_paise: creditPackage.price_paise,
currency: 'INR',
credits: creditPackage.credits,
status: 'created',
})
.select('id')
.single()
if (purchaseError || !purchase) {
console.error('Unable to save Razorpay order:', purchaseError)
// The Razorpay order may exist, but we must not
// return it for checkout without a purchase record.
return json({
error: 'Unable to prepare payment. Please retry.',
}, 500)
}
// Save immutable billing snapshot before permitting checkout.
const { error: billingError } = await supabaseAdmin.from('cveate_purchase_billing').insert({ purchase_id: purchase.id, user_id: auth.user.id, ...billing })
if (billingError) {
  console.error('Unable to save purchase billing snapshot:', billingError)
  // No checkout order is returned and no credits are granted.
  return json({ error: 'Unable to save billing details for this purchase. Please retry.' }, 500)
}
// 7. Return only safe checkout information.
return json({
purchaseId: purchase.id,
orderId: order.id,
keyId,
amount: creditPackage.price_paise,
currency: 'INR',
packageName: creditPackage.name,
credits: creditPackage.credits,
})
} catch (error) {
console.error('Razorpay order creation failed:', error)
return json({
error: 'Unable to create payment order.',
}, 500)
}
}
