import { NextRequest, NextResponse } from 'next/server'
import { adminLandingPath } from '@/lib/admin-permission-catalog'
import { getAdminPermissions } from '@/lib/admin-permissions'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'

export async function GET(request: NextRequest) {
  const authorizationHeader =
    request.headers.get('authorization')

  const admin = await requireAdmin(authorizationHeader)

  if (!admin) {
    return NextResponse.json(
      { authorized: false },
      {
        status: 403,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  const mfaVerified =
    await requireAdminMfa(authorizationHeader)

  let permissions: string[] = []
  let isOwner = false
  let permissionsReady = true
  let landingPath = '/admin'
  try {
    const access = await getAdminPermissions(admin.id)
    landingPath = adminLandingPath(access.permissions)
    if (mfaVerified) { permissions = access.permissions; isOwner = access.isOwner }
  } catch { permissionsReady = false }

  return NextResponse.json(
    {
      authorized: true,
      mfaVerified,
      permissions,
      isOwner,
      permissionsReady,
      landingPath,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}