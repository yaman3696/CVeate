export function employeeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[a-z0-9][a-z0-9._+-]*@cveat\.in$/.test(email) ? email : null
}
