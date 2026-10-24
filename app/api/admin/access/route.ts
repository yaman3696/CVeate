import { NextRequest, NextResponse } from 'next/server'
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

  return NextResponse.json(
    {
      authorized: true,
      mfaVerified,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}