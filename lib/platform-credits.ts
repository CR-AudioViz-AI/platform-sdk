/**
 * CR AudioViz AI - Centralized Credits System
 * 
 * Universal credits work across all apps.
 * Credits never expire on paid plans.
 */

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://craudiovizai.com'
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'unknown'

export interface CreditBalance {
  total: number
  used_this_month: number
  monthly_allowance: number
  bonus_credits: number
  expires_at: string | null  // null = never expires (paid plans)
}

export interface CreditTransaction {
  id: string
  amount: number
  type: 'spend' | 'purchase' | 'bonus' | 'refund' | 'subscription'
  description: string
  app_id: string
  created_at: string
}

/**
 * Get user's current credit balance
 */
export async function getCredits(token: string): Promise<CreditBalance> {
  const response = await fetch(`${PLATFORM_URL}/api/credits/balance`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-App-ID': APP_ID,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch credits')
  }

  return response.json()
}

/**
 * Spend credits for an action
 */
export async function spendCredits(
  token: string,
  amount: number,
  description: string
): Promise<{ success: boolean; remaining: number }> {
  const response = await fetch(`${PLATFORM_URL}/api/credits/spend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-App-ID': APP_ID,
    },
    body: JSON.stringify({ amount, description }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Insufficient credits')
  }

  return response.json()
}

/**
 * Check if user has enough credits
 */
export async function hasCredits(token: string, amount: number): Promise<boolean> {
  try {
    const balance = await getCredits(token)
    return balance.total >= amount
  } catch {
    return false
  }
}

/**
 * Get credit transaction history
 */
export async function getCreditHistory(
  token: string,
  limit = 50
): Promise<CreditTransaction[]> {
  const response = await fetch(
    `${PLATFORM_URL}/api/credits/history?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-App-ID': APP_ID,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch history')
  }

  return response.json()
}

/**
 * Open credit purchase modal (redirects to platform)
 */
export function purchaseCredits(returnUrl?: string) {
  const url = returnUrl || window.location.href
  window.location.href = `${PLATFORM_URL}/credits/purchase?return=${encodeURIComponent(url)}&app=${APP_ID}`
}

/**
 * Credit costs by action type
 */
export const CREDIT_COSTS = {
  // Javari AI
  'javari.chat': 1,
  'javari.code': 5,
  'javari.image': 10,
  'javari.document': 3,
  
  // CRAVBarrels
  'barrels.scan': 2,
  'barrels.collection': 1,
  'barrels.recommend': 3,
  
  // CardVerse
  'cards.create': 3,
  'cards.premium': 5,
  'cards.trade': 1,
  
  // Games
  'games.premium': 10,
  'games.tournament': 25,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS
