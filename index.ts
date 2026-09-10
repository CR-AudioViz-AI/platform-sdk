// CR AudioViz AI - Platform SDK
// Use this SDK to integrate any app with the centralized platform

// Supabase API keys — THE canonical resolution for the whole org.
//
// 2026-08-28: Supabase deletes the legacy anon/service_role JWTs in late 2026.
// 99 Vercel projects read them. Replaying the craudiovizai codemod across the
// other 98 apps would have created 98 copies of the accessor — the six-copies
// spread this SDK exists to end. Consumers import from here instead;
// craudiovizai keeps a local copy because it is the platform, not a consumer.
export {
  supabaseUrl,
  publishableKey,
  secretKey,
  keyReport,
  assertSupabaseKeys,
  type KeyGeneration,
  type SupabaseKeyReport,
} from './lib/supabase-keys'

// Auth
// 2026-08-27: THREE OF THESE DID NOT EXIST. platform-auth exports
// PlatformProvider, PlatformUser, getCurrentSession, getCurrentUser,
// getSupabaseClient, loginWithProvider, logout and onAuthStateChange.
//
// initPlatformAuth, handleAuthCallback and AuthSession were never there — so any
// app importing them from the SDK root failed to compile, and two REAL exports
// (getCurrentSession, onAuthStateChange) were unreachable because nobody listed
// them.
//
// Corrected against the module rather than the intent.
export {
  loginWithProvider,
  logout,
  getCurrentUser,
  getCurrentSession,
  getSupabaseClient,
  onAuthStateChange,
  type PlatformUser,
  type PlatformProvider,
} from './lib/platform-auth'

// Credits
export {
  getCredits,
  spendCredits,
  hasCredits,
  getCreditHistory,
  purchaseCredits,
  CREDIT_COSTS,
  type CreditBalance,
  type CreditTransaction,
  type CreditAction,
} from './lib/platform-credits'

// Components
export { CrossSellBanner } from './components/CrossSellBanner'
export { PlatformLogin } from './components/PlatformLogin'
export { PlatformNavbar } from './components/PlatformNavbar'

// 2026-08-27: THE BRAND BARREL WAS NEVER RE-EXPORTED FROM THE PACKAGE ROOT.
//
// components/brand/index.ts exports all six shell components correctly, and
// the package root never surfaced them. So javari-verify — which did the right
// thing and replaced its forked local copies with SDK imports — failed to
// compile against seven exports that exist on disk and were unreachable.
//
// Found by adding a typecheck gate to javari-verify, which had none. Eleven
// TS2305 errors on the first run, in a repo that had shipped for months.
//
// Wildcard rather than a named list: the brand barrel is the source of truth
// for what the shell exports, and a second hand-maintained list is exactly the
// drift this consolidation exists to remove.
export * from './components/brand';


// Egress guard — deliberately NOT re-exported from this barrel.
//
// 2026-08-29: it WAS exported here for about twenty minutes, and that was a
// defect. The guard imports node:dns/promises and node:net, and webpack rejects
// the `node:` scheme at the SCHEME stage — before resolve.fallback or
// resolve.alias is ever consulted, which is why the error is UnhandledSchemeError
// and not "Can't resolve". Anything importing this barrel therefore fails to
// build, including client components and edge routes that only wanted
// getCurrentUser. Caught by javari-scrapbook's build refusing to compile; had it
// merged, the next build in all 98 consumers would have broken the same way.
//
// A Node-only module does not belong in a barrel that client code imports. It is
// reached by its own path instead, which also makes the runtime requirement
// visible at the call site:
//
//   import { guardedFetch } from '@craudioviz/platform-sdk/lib/egress-guard';
//
// with `export const runtime = "nodejs"` on the route that uses it.
