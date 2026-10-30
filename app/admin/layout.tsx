
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import type { AdminAccessPermission } from '@/lib/admin-permission-catalog'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  BrainCircuit,
  Wallet,
  ShieldCheck,
  ScrollText,
  Settings,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react'

const navigation: { label: string; href: string; icon: typeof LayoutDashboard; disabled?: boolean }[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Enterprises', href: '/admin/enterprises', icon: Building2 },
  { label: 'Blog Management', href: '/admin/blog', icon: FileText },
  { label: 'AI Economics', href: '/admin/ai-economics', icon: BrainCircuit },
  { label: 'Revenue', href: '/admin/revenue', icon: Wallet },
  { label: 'Permissions', href: '/admin/permissions', icon: ShieldCheck },
  { label: 'Employees', href: '/admin/employees', icon: Users },
  { label: 'Audit Logs', href: '/admin/audit', icon: ScrollText },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

const sectionPermissions: Record<string, AdminAccessPermission> = {
  '/admin': 'overview.read', '/admin/users': 'users.read', '/admin/blog': 'blog.read',
  '/admin/ai-economics': 'ai_economics.read', '/admin/revenue': 'revenue.read',
  '/admin/audit': 'audit.read', '/admin/permissions': 'permissions.manage', '/admin/employees': 'permissions.manage', '/admin/settings': 'permissions.manage', '/admin/enterprises': 'permissions.manage',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const [access, setAccess] = useState<{ permissions: string[]; ready: boolean } | null>(null)
  useEffect(() => {
    if (pathname === '/admin/mfa') return
    const controller = new AbortController()
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (controller.signal.aborted) return
        if (!session) { router.replace('/'); return }
        const response = await fetch('/api/admin/access', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (controller.signal.aborted) return
        if (!response.ok || !result.authorized) { router.replace('/'); return }
        if (!result.mfaVerified) { router.replace(getAdminMfaHref(pathname + window.location.search)); return }
        setAccess({ permissions: result.permissions ?? [], ready: result.permissionsReady !== false })
      } catch { if (!controller.signal.aborted) setAccess({ permissions: [], ready: false }) }
    }
    void load()
    return () => controller.abort()
  }, [pathname, router])
  const section = Object.keys(sectionPermissions).find(path => path !== '/admin' && (pathname === path || pathname.startsWith(path + '/'))) || '/admin'
  const needed = pathname === '/admin/blog/new' ? 'blog.create' : pathname.startsWith('/admin/blog/edit/') ? 'blog.update' : sectionPermissions[section]

  // MFA setup and verification use a separate focused screen.
  if (pathname === '/admin/mfa') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#101C36] text-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="text-xl font-extrabold tracking-tight"
          >
            CVeat <span className="text-indigo-400">Admin</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Platform
          </p>

          {navigation.map((item) => {
            const Icon = item.icon
            const active =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href + '/'))

            if (item.disabled || (access && sectionPermissions[item.href] && !access.permissions.includes(sectionPermissions[item.href]))) {
              return (
                <div
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600"
                  title={item.disabled ? "Coming soon" : "Access not granted"}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to CVeat
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-sm font-semibold text-slate-800">
              CVeat Administration
            </h1>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Admin Workspace
          </span>
        </header>

        <div className="min-w-0">{!access ? <p className="p-8">Checking permissions…</p> : !access.ready ? <div className="p-8"><h2 className="text-xl font-bold">Permissions unavailable</h2><p className="mt-3 text-sm">Complete the permission database setup first. If setup is complete, try refreshing or check your connection.</p></div> : pathname !== '/admin/denied' && needed && !access.permissions.includes(needed) ? <div className="p-8"><h2 className="text-xl font-bold">Access not granted</h2><p className="mt-3 text-sm">Ask the designated owner to grant access to this section.</p></div> : children}</div>
      </div>
    </div>
  )
}
