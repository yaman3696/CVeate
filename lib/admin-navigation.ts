/** Accept only local admin destinations; never redirect to an external URL. */
export function getAdminReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return '/admin'
  try {
    const url = new URL(value, 'https://admin.invalid')
    const path = url.pathname
    const decodedPath = decodeURIComponent(path)
    if (url.origin !== 'https://admin.invalid' || (path !== '/admin' && !path.startsWith('/admin/')) || path === '/admin/mfa' || path.startsWith('/admin/mfa/') || decodedPath === '/admin/mfa' || decodedPath.startsWith('/admin/mfa/')) return '/admin'
    // Reject encoded path separators and control characters as well.
    if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(path)) return '/admin'
    return path + url.search + url.hash
  } catch { return '/admin' }
}

export function getAdminMfaHref(returnTo: string): string {
  return `/admin/mfa?next=${encodeURIComponent(getAdminReturnPath(returnTo))}`
}
