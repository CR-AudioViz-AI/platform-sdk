// CR AudioViz AI - Platform SDK
// Use this SDK to integrate any app with the centralized platform

// Auth
export {
  initPlatformAuth,
  loginWithProvider,
  handleAuthCallback,
  logout,
  getCurrentUser,
  type PlatformUser,
  type AuthSession,
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
