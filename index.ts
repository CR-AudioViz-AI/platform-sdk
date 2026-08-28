// CR AudioViz AI - Platform SDK
// Use this SDK to integrate any app with the centralized platform

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
