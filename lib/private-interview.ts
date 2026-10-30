import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
export type PrivateInterview = {
  mode?: "text" | "conversation" | "unknown";
  id: string;
  user: string;
  role: string;
  seniority: string;
  questions: string[];
  expires: number;
};
const signature = (payload: string) => {
  const secret =
    process.env.INTERVIEW_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw Error("Interview signing is not configured.");
  return createHmac("sha256", secret)
    .update(`cveat-private-interview-v1:${payload}`)
    .digest();
};
export function signInterview(value: PrivateInterview) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}
export function verifyInterview(
  token: unknown,
  user: string,
): PrivateInterview | null {
  if (typeof token !== "string" || token.length > 20000) return null;
  try {
    const [payload, sig, extra] = token.split(".");
    const actual = Buffer.from(sig || "", "base64url"),
      expected = signature(payload);
    if (
      extra ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      return null;
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as PrivateInterview;
    if (
      value.user !== user ||
      value.expires < Date.now() ||
      !Array.isArray(value.questions) ||
      value.questions.length !== 5
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
