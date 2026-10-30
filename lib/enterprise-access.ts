import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/require-admin";
/** Fail closed if the allowlist is unavailable. Never trust a client profile or email domain. */
export async function enterpriseAccess(userId: string, token: string | null) {
  const admin = await requireAdmin(token);
  if (admin?.id === userId) return { allowed: true, isAdmin: true };
  const grant = await supabaseAdmin
    .from("enterprise_access_grants")
    .select("user_id")
    .eq("user_id", userId)
    .eq("enabled", true)
    .maybeSingle();
  return { allowed: !grant.error && !!grant.data, isAdmin: false };
}
