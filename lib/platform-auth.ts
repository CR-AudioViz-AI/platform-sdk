/**
 * CR AudioViz AI - Centralized Platform Authentication
 * 
 * All apps use this SDK to authenticate users through the central hub.
 * Supports: Google OAuth, GitHub OAuth, Email Magic Link
 */

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://craudiovizai.com'
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'unknown'

export interface PlatformUser {
  id: string
  email: string
  name: string
  avatar_url?: string
  credits_balance: number
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  apps_access: string[]
  created_at: string
  last_login: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: PlatformUser
}

/**
 * Initialize platform auth - call on app startup
 */
export async function initPlatformAuth(): Promise<AuthSession | null> {
  try {
    const token = getStoredToken()
    if (!token) return null

    const response = await fetch(`${PLATFORM_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-ID': APP_ID,
      },
      body: JSON.stringify({ token }),
      credentials: 'include',
    })

    if (!response.ok) {
      clearStoredToken()
      return null
    }

    const session = await response.json()
    return session as AuthSession
  } catch (error) {
    console.error('Platform auth init failed:', error)
    return null
  }
}

/**
 * Redirect to platform OAuth login
 */
export function loginWithProvider(provider: 'google' | 'github' | 'email') {
  const returnUrl = encodeURIComponent(window.location.href)
  const authUrl = `${PLATFORM_URL}/auth/login?provider=${provider}&app=${APP_ID}&return=${returnUrl}`
  window.location.href = authUrl
}

/**
 * Handle OAuth callback
 */
export async function handleAuthCallback(): Promise<AuthSession | null> {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const error = params.get('error')

  if (error) throw new Error(`Auth error: ${error}`)
  if (!token) return null

  storeToken(token)
  return initPlatformAuth()
}

/**
 * Logout from platform (all apps)
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${PLATFORM_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'X-App-ID': APP_ID },
      credentials: 'include',
    })
  } finally {
    clearStoredToken()
    window.location.href = PLATFORM_URL
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<PlatformUser | null> {
  const session = await initPlatformAuth()
  return session?.user || null
}

// Token storage
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('crav_platform_token')
}

function storeToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('crav_platform_token', token)
}

function clearStoredToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('crav_platform_token')
}
