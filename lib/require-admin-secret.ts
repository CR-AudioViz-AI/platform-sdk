// lib/require-admin-secret.ts — header-secret gate that fails CLOSED
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
//
// Six routes gated themselves like this:
//
//     if (secret !== (process.env.CANONICAL_ADMIN_SECRET ?? "javari-admin"))
//
// On 2026-08-28, CANONICAL_ADMIN_SECRET and ADMIN_SECRET_KEY were both UNSET in
// Vercel. So the gate on /api/admin/seed — which creates profiles, grants
// credits and calls auth.admin.listUsers() over every account — was the string
// "javari-admin", published in the route's own source in a repo, and live in
// production. Confirmed live: the route answered 401 to a wrong value, meaning
// it was really comparing, and really would have accepted the published one.
//
// This is the same defect Roy closed on clear-scheduler-lock earlier that day.
// It recurred because nothing stopped it recurring.
//
// THE RULE: a missing secret is a REFUSAL, never a default. An unset gate must
// fail closed and say so, not silently fall back to a value an attacker can
// read in the repository.
//
// Enforced by scripts/audit-route-auth.mjs, which now fails the build on any
// `process.env.<...SECRET|KEY|TOKEN> ?? "<literal>"` comparison in a route.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY IT IS IN THE SDK, 2026-08-29
//
// javari-admin has three API routes. All three are under /api/admin/. None of
// them has any authentication, and the repo has no middleware either — so
// /api/admin/bulk-import is a PUBLIC endpoint that fetches any URL it is given
// and writes the result into the knowledge base, with the service-role key in
// scope.
//
// Copying this file there would make it the second copy, and the next repo the
// third. It lives here now and craudiovizai's copy stays only because
// craudiovizai IS the platform, not a consumer of it — the same rule the
// Supabase key accessor follows.
//
// Import by path, not from the package barrel:
//   import { requireAdminSecret } from '@craudioviz/platform-sdk/lib/require-admin-secret'
//
// CR AudioViz AI, LLC · EIN 39-3646201 · 2026-08-28, moved 2026-08-29

import { NextResponse } from "next/server";

/**
 * Constant-time-ish comparison. Not timingSafeEqual, because that throws on
 * length mismatch and would leak length through the exception path; this
 * compares every byte of the longer string either way.
 */
function equals(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Require a shared-secret header.
 *
 * Returns null when the caller is authorised, or the response to return.
 *
 * @param envName the environment variable holding the expected value. If it is
 *        unset or shorter than 16 characters, EVERY request is refused — an
 *        under-configured gate protects nothing, and pretending otherwise is
 *        how a published literal ends up guarding the credit ledger.
 */
export function requireAdminSecret(
  req: Request,
  envName: string,
  headerName = "x-admin-secret",
): NextResponse | null {
  const expected = process.env[envName] ?? "";

  if (expected.length < 16) {
    console.error(JSON.stringify({
      level: "ERROR",
      event: "ADMIN_SECRET_UNCONFIGURED",
      env: envName,
      message: `${envName} is unset or too short; refusing every request rather than falling back to a default`,
    }));
    return NextResponse.json({ error: "Endpoint is not configured" }, { status: 503 });
  }

  const got = req.headers.get(headerName) ?? "";
  if (!got || !equals(got, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
