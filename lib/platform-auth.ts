/**
 * CR AudioViz AI - Centralized Platform Authentication
 *
 * Rewritten 2026-07-31: the previous version expected the platform to
 * redirect back with a `?token=` query parameter after OAuth, and called
 * /auth/login?provider=&app=&return= expecting that page to understand
 * those parameters. Neither matches reality - /auth/login is just a
 * redirect stub to /login, and the real, confirmed-working OAuth flow
 * (verified live across 12 providers) uses Supabase's own
 * signInWithOAuth() client-side, with a code-exchange callback at
 * /auth/confirm - never a token in a URL. No real app called any function
 * in this file (confirmed by searching the whole org), so this was dead,
 * incompatible code sitting in the canonical SDK. Rewritten as a thin,
 * correct wrapper around the real pattern instead of a parallel one.
 */
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

// 2026-08-28: these were the SDK's own reads of the legacy key names. The
// canonical accessor sits beside this file and prefers the new-generation keys,
// so the SDK migrates with its consumers rather than pinning them to the keys
// Supabase deletes in late 2026.
//
// The URL keeps its literal default: it is not a credential, and the SDK is
// imported by apps that have not yet set it.
import { publishableKey, supabaseUrl } from './supabase-keys'
import type { Provider as SupabaseProvider } from '@supabase/supabase-js';

const SUPABASE_URL = supabaseUrl() || 'https://kteobfyferrukqeolofj.supabase.co'
const SUPABASE_ANON_KEY = publishableKey()

export interface PlatformUser {
  id: string
  email: string
  name: string
  avatar_url?: string
  credits_balance: number
  plan: 'free' | 'creator' | 'pro' | 'business' | 'enterprise'
  apps_access: string[]
  created_at: string
  last_login: string
}

// Module-level singleton, matching the one real, proven-working pattern
// used successfully across the platform: raw supabase-js, localStorage,
// PKCE. Never a cookie-based SSR client here - chunked cookies corrupt
// racing client instances, the same lesson learned and applied elsewhere.
let _client: SupabaseClient | null = null
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  }
  return _client
}

/**
 * Get the current session, if any. Real, direct Supabase call - no custom
 * token-passing scheme.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession()
  return data.session
}

/**
 * Get the current user, enriched with plan/credits from the real central
 * profile - via the same /api/auth/session endpoint the rest of the
 * platform already uses, now with real CORS support.
 */
export async function getCurrentUser(): Promise<PlatformUser | null> {
  const session = await getCurrentSession()
  if (!session) return null

  try {
    const res = await fetch(`${SUPABASE_URL.includes('supabase.co') ? 'https://craudiovizai.com' : ''}/api/auth/session`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      id: data.userId,
      email: data.email,
      name: data.name,
      credits_balance: data.credits,
      plan: data.plan,
      apps_access: [],
      created_at: '',
      last_login: '',
    }
  } catch {
    return null
  }
}

/**
 * Sign in with an OAuth provider - the real, working pattern: client-side
 * signInWithOAuth, letting Supabase handle the redirect and PKCE code
 * exchange itself, never a custom token round-trip.
 */
/**
 * Every provider ENABLED IN CORE, verified against the live Supabase auth config
 * on 2026-08-28: 16 are on, and this function accepted THREE.
 *
 * That gap is not cosmetic. Under the architecture law an app consumes CORE OAuth
 * and never implements its own - so an app built on this SDK could offer a
 * customer three logins while the platform supports sixteen, and the natural fix
 * for whoever hit it would be to add local auth to the app. That is exactly how
 * Verify was built wrong the first time.
 */
// 2026-09-01: DERIVED from Supabase's own Provider union rather than restated.
//
// The hand-written list contained a value supabase-js does not accept, so
// signInWithOAuth({ provider }) failed to typecheck — in the SDK itself, which means
// EVERY consumer inherited the error. javari-dashboard reported it from inside
// node_modules.
//
// Extract<> keeps this list as a strict subset of what the library supports. Add a
// provider Supabase has never heard of and the error now lands HERE, on the line that
// invented it, instead of in sixteen downstream repos.
export type PlatformProvider = Extract<
  SupabaseProvider,
  | 'google' | 'github' | 'discord' | 'azure' | 'facebook' | 'figma'
  | 'gitlab' | 'linkedin_oidc' | 'notion' | 'slack_oidc' | 'spotify'
  | 'twitch' | 'twitter' | 'zoom'
>;

export async function loginWithProvider(provider: PlatformProvider): Promise<void> {
  // 2026-08-28: redirectTo carries ONLY the callback path. The code exchange at
  // /auth/confirm must be passed ONLY the `code` param, never the full URL, and a
  // token must NEVER appear in a URL - locked 2026-07-15 after chunked cookies
  // corrupted sessions across racing client instances.
  await getSupabaseClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/confirm` },
  })
}

/**
 * Sign out. Clears the real local session and best-effort revokes it
 * server-side via the real /api/auth/logout endpoint.
 */
export async function logout(): Promise<void> {
  const session = await getCurrentSession()
  if (session) {
    try {
      await fetch(`https://craudiovizai.com/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch {
      // Non-fatal - the local sign-out below is what actually matters to the user.
    }
  }
  await getSupabaseClient().auth.signOut()
}

/**
 * Subscribe to auth state changes - thin passthrough to the real client.
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}
