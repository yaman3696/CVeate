/** Shared minimum CV requirements for onboarding and workspace entry. Not an auth boundary. */
export function isResumeReady(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, any>
  const text = (x: unknown) => typeof x === 'string' ? x.replace(/<[^>]*>/g, ' ').trim() : ''
  if (!['fullName','headline','city','state'].every(k => text(d[k])) || !/^\S+@\S+\.\S+$/.test(text(d.email)) || !/^\d{10}$/.test(text(d.phone))) return false
  if (text(d.pincode) && !/^\d{6}$/.test(d.pincode)) return false
  if (!Array.isArray(d.qualifications) || !d.qualifications.some((q: any) => text(q?.degree) && text(q?.institution))) return false
  const skills = Array.isArray(d.technicalSkills) ? d.technicalSkills.join(',') : text(d.technicalSkills)
  if (!skills.split(',').some((s: string) => s.trim()) && !(Array.isArray(d.skillGroups) && d.skillGroups.some((g: any) => text(g?.skills)))) return false
  if (!text(d.languages).split(',').some(s => s.trim())) return false
  if (Array.isArray(d.experiences) && d.experiences.some((e: any) => [e?.role,e?.company,e?.bullets,e?.startDate,e?.duration].some(text) && !(text(e?.role) && text(e?.company) && text(e?.bullets)))) return false
  for (const list of [d.experiences,d.qualifications]) if (Array.isArray(list) && list.some((e: any) => (e?.current && e?.endDate) || (e?.startDate && e?.endDate && e.endDate < e.startDate))) return false
  return true
}
