export const ADMIN_PERMISSION_CATALOG = {
  'overview.read': 'View Overview',
  'users.read': 'View users and contact details',
  'revenue.read': 'View purchases and revenue',
  'ai_economics.read': 'View AI Economics',
  'audit.read': 'View Audit Logs',
  'blog.read': 'View articles and drafts',
  'blog.create': 'Create articles',
  'blog.update': 'Edit articles',
  'blog.delete': 'Delete articles',
  'blog.publish': 'Publish articles',
} as const
export type AdminPermission = keyof typeof ADMIN_PERMISSION_CATALOG
export const ADMIN_PERMISSIONS = Object.keys(ADMIN_PERMISSION_CATALOG) as AdminPermission[]
export type AdminAccessPermission = AdminPermission | 'permissions.manage'

export function adminLandingPath(permissions: readonly string[]): string {
  const destinations: [string,string][] = [['overview.read','/admin'],['blog.read','/admin/blog'],['users.read','/admin/users'],['revenue.read','/admin/revenue'],['ai_economics.read','/admin/ai-economics'],['audit.read','/admin/audit']]
  return destinations.find(([key]) => permissions.includes(key))?.[1] || '/admin/denied'
}
