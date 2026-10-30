import { NextRequest } from "next/server";
import {
  enterpriseUser,
  privateHeaders as headers,
} from "@/lib/enterprise-server";
import { enterpriseAccess } from "@/lib/enterprise-access";
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization"),
      user = await enterpriseUser(token);
    if (!user)
      return Response.json({ allowed: false, isAdmin: false }, { headers });
    return Response.json(await enterpriseAccess(user.id, token), { headers });
  } catch {
    return Response.json(
      { allowed: false, isAdmin: false },
      { status: 503, headers },
    );
  }
}
