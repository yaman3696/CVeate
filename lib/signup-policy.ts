import domains from '@/data/disposable-email-domains.json'
export const mobileError = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
export function validSignupMobile(value: string) { return /^[6-9]\d{9}$/.test(value) && !/^(\d)\1{9}$/.test(value) }
export function disposableEmail(email: string) { const domain = email.trim().toLowerCase().split('@')[1] || ''; return domains.some(blocked => domain === blocked || domain.endsWith('.' + blocked)) }
export async function signupTicket(email: string, mobile: string) {
  let browserId = ''
  try { browserId = localStorage.getItem('cveat-signup-browser') || crypto.randomUUID(); localStorage.setItem('cveat-signup-browser', browserId) } catch { browserId = crypto.randomUUID() }
  const response = await fetch('/api/auth/signup-check', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase(),mobile,browserId})})
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Signup checks are unavailable. Please try again.')
  return data.ticket as string
}
