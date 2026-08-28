/**
 * CR AudioViz AI — Supabase API key resolution. THE canonical copy.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS LIVES IN THE SDK
 *
 * Supabase deletes the legacy `anon` / `service_role` JWTs in late 2026
 * (supabase/discussions#29260: "you have to migrate to use the new API keys by
 * this point or your app will break"). 99 Vercel projects read those keys.
 *
 * The migration was first built as lib/supabase/keys.ts inside craudiovizai,
 * with a codemod to replay it across the other 98 apps. That would have created
 * 98 copies of this file — precisely the six-copies spread that
 * lib/supabase/server.ts documents costing a day when a cache fix landed in one
 * copy and never reached the other five. Copy 99 drifts, and nobody can say
 * which one is authoritative.
 *
 * So consumers import from '@craudioviz/platform-sdk'. craudiovizai keeps a
 * local copy because it is the platform, not a consumer.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE FALLBACK IS TEMPORARY AND MUST NOT OUTLIVE ITS PURPOSE
 *
 * Preferring the new key and falling back to the legacy one is what makes the
 * cutover an environment variable and the rollback a deletion. It is also, on
 * its own, the same defect this migration removed from GameDatabase.js: a
 * fallback that keeps an under-configured environment looking healthy right up
 * until the day the fallback stops answering.
 *
 * The difference is not the fallback. It is that this one is OBSERVABLE:
 * assertSupabaseKeys() fails loudly the moment an environment has only the
 * legacy key, and downgrading that to a warning requires setting
 * SUPABASE_ALLOW_LEGACY_ONLY=1, which is a decision someone makes and leaves a
 * record of.
 *
 *   FALLBACK REMOVAL TARGET: 2026-12-31.
 *
 * On that date the `?? process.env.SUPABASE_SERVICE_ROLE_KEY` and
 * `?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` clauses below come out, along
 * with SUPABASE_ALLOW_LEGACY_ONLY. If that date passes and they are still here,
 * the fallback has outlived its purpose and is now just the masking defect.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY EVERY REFERENCE IS WRITTEN OUT LONGHAND
 *
 * Next.js inlines process.env at BUILD time by matching the literal text
 * `process.env.NEXT_PUBLIC_FOO`. A dynamic lookup — process.env[name] — is not
 * matched, is not inlined, and resolves to undefined in the browser. Do not
 * refactor these into a loop or a lookup table; it fails silently, in the
 * browser, in production builds only.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201 · 2026-08-28
 */

/** Which key generation a resolved value came from. */
export type KeyGeneration = 'new' | 'legacy' | 'missing'

export interface SupabaseKeyReport {
  url: boolean
  publishable: KeyGeneration
  secret: KeyGeneration
  /** Both keys resolved from the new generation. */
  migrated: boolean
  /** At least one key resolved only because the legacy fallback caught it. */
  onLegacyFallback: boolean
}

function generationOf(value: string): KeyGeneration {
  if (!value) return 'missing'
  if (value.startsWith('sb_publishable_') || value.startsWith('sb_secret_')) return 'new'
  return 'legacy'
}

/** The project URL. Unchanged by the key migration; here so callers need one import. */
export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

/**
 * The public, browser-safe key. RLS applies.
 * Prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, falls back to the legacy anon JWT.
 */
export function publishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  )
}

/**
 * The server-only key. BYPASSES ALL RLS.
 * Prefers SUPABASE_SECRET_KEY, falls back to the legacy service_role JWT.
 *
 * Deliberately NOT a NEXT_PUBLIC_ name, so a client component that calls this
 * gets an empty string rather than shipping the key to the browser — a failure
 * that is loud and local instead of catastrophic and silent.
 */
export function secretKey(): string {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
}

/**
 * Which generation each key resolved from.
 *
 * Generations and presence only — never key material. This is called from
 * places whose output is logged, and a service-role key in a log line is a
 * leaked service-role key.
 */
export function keyReport(): SupabaseKeyReport {
  const publishable = generationOf(publishableKey())
  const secret = generationOf(secretKey())
  return {
    url: Boolean(supabaseUrl()),
    publishable,
    secret,
    migrated: publishable === 'new' && secret === 'new',
    onLegacyFallback: publishable === 'legacy' || secret === 'legacy',
  }
}

/**
 * Fail loudly when an environment is running on the legacy fallback.
 *
 * THIS IS WHAT SEPARATES THIS FALLBACK FROM THE ONE THE MIGRATION DELETED.
 * Without it, an environment missing SUPABASE_SECRET_KEY looks perfectly
 * healthy today and dies the day Supabase removes the legacy keys, with no
 * configuration signal — which is the exact failure mode, in the exact words,
 * used to justify deleting the hardcoded JWT from GameDatabase.js.
 *
 * Call from boot (instrumentation.ts register) and from a prebuild gate.
 *
 * @param opts.throwOnLegacy default true. SUPABASE_ALLOW_LEGACY_ONLY=1
 *        downgrades it to a warning — the escape hatch for a deliberate
 *        rollback to the legacy key, which must stay possible. Setting it is a
 *        decision someone makes and leaves a record of, which is the whole
 *        difference from a fallback that says nothing.
 */
export function assertSupabaseKeys(opts: { throwOnLegacy?: boolean; label?: string } = {}): SupabaseKeyReport {
  const r = keyReport()
  const label = opts.label ?? process.env.NEXT_PUBLIC_APP_ID ?? 'app'
  const allowLegacy = process.env.SUPABASE_ALLOW_LEGACY_ONLY === '1'
  const shouldThrow = (opts.throwOnLegacy ?? true) && !allowLegacy

  if (!r.url) {
    throw new Error(`[supabase-keys] ${label}: NEXT_PUBLIC_SUPABASE_URL is not set`)
  }
  if (r.secret === 'missing' && r.publishable === 'missing') {
    throw new Error(`[supabase-keys] ${label}: no Supabase key of either generation is set`)
  }
  if (!r.onLegacyFallback) return r

  const which = [
    r.secret === 'legacy' ? 'SUPABASE_SECRET_KEY' : null,
    r.publishable === 'legacy' ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' : null,
  ].filter(Boolean).join(', ')

  const msg =
    `[supabase-keys] ${label}: running on the LEGACY Supabase key fallback. ` +
    `Missing: ${which}. Supabase deletes the legacy anon/service_role keys in late 2026; ` +
    `this environment works today and will fail then with no other warning. ` +
    `Set the variable(s) above, or set SUPABASE_ALLOW_LEGACY_ONLY=1 to acknowledge a deliberate rollback.`

  if (shouldThrow) throw new Error(msg)
  console.warn(msg)
  return r
}
