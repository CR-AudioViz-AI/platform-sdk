/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    CR AUDIOVIZ AI - CENTRAL SERVICES                         ║
 * ║                                                                               ║
 * ║  A Henderson Platform Production - Cindy & Roy Henderson                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  This is the SINGLE SOURCE OF TRUTH for all shared services.                 ║
 * ║  Everything routes through craudiovizai.com/api for central services.        ║
 * ║                                                                               ║
 * ║  Services Provided:                                                           ║
 * ║  - Authentication (OAuth, Email/Password, Session)                            ║
 * ║  - Credits (Balance, Spend, Refund, History, Admin Bypass)                    ║
 * ║  - Payments (Stripe, PayPal, Checkout)                                        ║
 * ║  - Support (Tickets, Knowledge Base, Chat)                                    ║
 * ║  - Enhancements (Feature Requests, Voting, Roadmap)                           ║
 * ║  - Analytics (Events, Page Views, Conversions)                                ║
 * ║  - Activity (Audit Trail, User Actions)                                       ║
 * ║  - Notifications (Email, Push, In-App)                                        ║
 * ║  - Registry (App Discovery, Health Reporting)                                 ║
 * ║  - Cross-Selling (Recommendations)                                            ║
 * ║                                                                               ║
 * ║  NO app should have its own auth, payment, or credit endpoints.              ║
 * ║  Everything goes through the central hub at craudiovizai.com                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 3.1.0
 * @date January 9, 2026
 * @author CR AudioViz AI - Cindy & Roy Henderson
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export const CENTRAL_DOMAIN = 'craudiovizai.com';
export const CENTRAL_API_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_URL || `https://${CENTRAL_DOMAIN}/api`;

// ============================================================================
// ADMIN BYPASS - Roy & Cindy Henderson get FREE access to EVERYTHING
// ============================================================================

export const ADMIN_EMAILS: string[] = [
  'royhenderson@craudiovizai.com',
  'cindyhenderson@craudiovizai.com',
  'roy@craudiovizai.com',
  'cindy@craudiovizai.com',
  'admin@craudiovizai.com'
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function shouldChargeCredits(email: string | null | undefined): boolean {
  return !isAdmin(email);
}

// ============================================================================
// CREDIT COSTS BY ACTION
// ============================================================================

export const CREDIT_COSTS: Record<string, number> = {
  // AI Generation
  'ai_image': 5,
  'ai_video': 20,
  'ai_audio': 10,
  'ai_text': 1,
  'ai_code': 2,
  'ai_chat': 1,
  
  // Pattern Generation (Crochet, Knitting, Machine Knit)
  'pattern_basic': 3,
  'pattern_intermediate': 5,
  'pattern_advanced': 10,
  'pattern_custom': 15,
  
  // Documents
  'pdf_generate': 3,
  'pdf_merge': 2,
  'pdf_convert': 2,
  'ebook_generate': 10,
  'ebook_convert': 5,
  'invoice_generate': 2,
  'presentation_generate': 5,
  'resume_generate': 3,
  'cover_letter_generate': 2,
  'email_template_generate': 1,
  'social_post_generate': 1,
  
  // Real Estate
  'property_analysis': 5,
  'market_report': 10,
  'listing_generate': 3,
  
  // Games
  'game_play': 0,  // Free
  'game_premium_feature': 2,
  
  // Market/Trading
  'stock_analysis': 3,
  'crypto_analysis': 3,
  'market_prediction': 5,
  
  // Travel
  'itinerary_generate': 5,
  'travel_recommendation': 2,
  
  // Misc
  'export_data': 1,
  'premium_feature': 2,
  'api_call': 1
};

export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action] || 1;
}

// ============================================================================
// TYPES
// ============================================================================

export interface CentralResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  credits_balance: number;
  subscription_tier: 'free' | 'creator' | 'pro' | 'business' | 'enterprise';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'spend' | 'refund' | 'purchase' | 'bonus' | 'monthly_allocation';
  description: string;
  app_id: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface Enhancement {
  id: string;
  title: string;
  description: string;
  status: 'proposed' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  votes: number;
  user_id: string;
  app_id?: string;
  created_at: string;
}

// ============================================================================
// CORE FETCH HELPER
// ============================================================================

// Fixed 2026-07-31: this previously authenticated ONLY via
// credentials:'include' (cookies) - broken for every real cross-origin
// caller, since third-party cookies are blocked by default in Safari and
// Firefox. Confirmed by searching the whole org: of ~60 repos that import
// this file, only ONE real call site actually invoked a network method here
// (CentralCredits.spend in javari-legal-docs) - and that was already
// rewritten to bypass this broken path with a direct Bearer token. This is
// very likely why javari-social and javari-activity each built their own
// separate, disconnected local credit tables instead of using this shared
// service: the shared mechanism never actually worked cross-origin.
//
// Real fix, with zero breaking changes to any of the 30+ public methods
// below: centralFetch now reads the real session token directly from where
// Supabase's own client already stores it (localStorage, same project
// across every app) and sends it as a real Authorization: Bearer header -
// the same pattern already proven working everywhere else on the platform
// tonight. credentials:'include' is kept alongside it for same-origin
// callers (harmless there, no regression), but the real fix is the header.
function getStoredSupabaseToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace('https://', '').split('.')[0];
    if (!projectRef) return null;
    const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token ?? parsed?.currentSession?.access_token ?? null;
  } catch {
    return null;
  }
}

async function centralFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<CentralResponse<T>> {
  try {
    const url = `${CENTRAL_API_BASE}${endpoint}`;
    const token = getStoredSupabaseToken();
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      credentials: 'include', // Kept for same-origin callers; the real fix is the Authorization header above
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
        code: data.code || String(response.status)
      };
    }

    return { success: true, data: data.data || data };
  } catch (error) {
    console.error(`[CentralServices] Error fetching ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      code: 'NETWORK_ERROR'
    };
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const CentralAuth = {
  /**
   * Get current user session
   */
  async getSession(): Promise<CentralResponse<User | null>> {
    return centralFetch<User | null>('/auth/session');
  },

  /**
   * Sign in with email/password
   */
  async signIn(email: string, password: string): Promise<CentralResponse<User>> {
    return centralFetch<User>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  /**
   * Sign up with email/password
   */
  async signUp(email: string, password: string, name?: string): Promise<CentralResponse<User>> {
    return centralFetch<User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
  },

  /**
   * Sign out
   */
  async signOut(): Promise<CentralResponse<void>> {
    return centralFetch<void>('/auth/signout', { method: 'POST' });
  },

  /**
   * Get OAuth URL for provider
   */
  getOAuthUrl(provider: 'google' | 'github' | 'discord', redirectTo?: string): string {
    const params = new URLSearchParams({ provider });
    if (redirectTo) params.set('redirectTo', redirectTo);
    return `${CENTRAL_API_BASE}/auth/oauth?${params.toString()}`;
  },

  /**
   * Password reset request
   */
  async requestPasswordReset(email: string): Promise<CentralResponse<void>> {
    return centralFetch<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  /**
   * Update password with reset token
   */
  async updatePassword(token: string, password: string): Promise<CentralResponse<void>> {
    return centralFetch<void>('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<CentralResponse<void>> {
    return centralFetch<void>(`/auth/verify-email?token=${token}`);
  }
};

// ============================================================================
// CREDITS
// ============================================================================

export const CentralCredits = {
  /**
   * Get current credit balance
   */
  async getBalance(): Promise<CentralResponse<{ balance: number; tier: string }>> {
    return centralFetch<{ balance: number; tier: string }>('/credits/balance');
  },

  /**
   * Spend credits for an action
   * @param amount - Number of credits to spend
   * @param appId - ID of the app making the request
   * @param description - Human-readable description of the action
   * @param userEmail - Optional user email to check for admin bypass
   */
  async spend(
    amount: number,
    appId: string,
    description: string,
    userEmail?: string
  ): Promise<CentralResponse<{ balance: number; charged: number }>> {
    // Admin bypass - don't charge credits
    if (userEmail && isAdmin(userEmail)) {
      console.log(`[CentralServices] Admin bypass: ${userEmail} - skipping ${amount} credit charge`);
      const balance = await this.getBalance();
      return {
        success: true,
        data: { balance: balance.data?.balance || 0, charged: 0 }
      };
    }

    // Fixed 2026-07-31: the real endpoint reads the app id from the
    // x-app-id HEADER, not the request body - every call through this SDK
    // was silently attributed as 'unknown' before this fix.
    return centralFetch<{ balance: number; charged: number }>('/credits/spend', {
      method: 'POST',
      headers: { 'x-app-id': appId },
      body: JSON.stringify({ amount, app_id: appId, description })
    });
  },

  /**
   * Refund credits
   */
  async refund(
    amount: number,
    appId: string,
    reason: string,
    originalTransactionId?: string
  ): Promise<CentralResponse<{ balance: number }>> {
    return centralFetch<{ balance: number }>('/credits/refund', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        app_id: appId,
        reason,
        original_transaction_id: originalTransactionId
      })
    });
  },

  /**
   * Get credit transaction history
   */
  async getHistory(limit = 50, offset = 0): Promise<CentralResponse<CreditTransaction[]>> {
    return centralFetch<CreditTransaction[]>(`/credits/history?limit=${limit}&offset=${offset}`);
  },

  /**
   * Check if user can afford an action
   */
  async canAfford(action: string, userEmail?: string): Promise<CentralResponse<boolean>> {
    // Admin bypass
    if (userEmail && isAdmin(userEmail)) {
      return { success: true, data: true };
    }

    const cost = getCreditCost(action);
    const balance = await this.getBalance();
    
    if (!balance.success || !balance.data) {
      return { success: false, error: 'Could not check balance' };
    }

    return { success: true, data: balance.data.balance >= cost };
  },

  /**
   * Spend credits for a specific action type
   */
  async spendForAction(
    action: string,
    appId: string,
    userEmail?: string
  ): Promise<CentralResponse<{ balance: number; charged: number }>> {
    const cost = getCreditCost(action);
    return this.spend(cost, appId, action, userEmail);
  }
};

// ============================================================================
// PAYMENTS
// ============================================================================

// Fixed 2026-07-31: every endpoint in this object pointed at a route that
// does not exist (/payments/checkout, /payments/credits, /payments/portal,
// /payments/subscription all confirmed 404 against the real repo) - this
// entire object was non-functional. createCheckout/purchaseCredits now call
// the real, verified-working central checkout endpoint used successfully
// elsewhere on the platform tonight. getBillingPortal/getSubscription still
// have no real cross-origin-safe equivalent to point to - the one existing
// billing endpoint (/api/customer/billing) authenticates via same-origin
// cookies only, so it can't serve satellite apps either. Flagging rather
// than pointing at something that would also silently fail.
export const CentralPayments = {
  /**
   * Create checkout session for a subscription tier
   */
  async createCheckout(
    tierId: 'creator' | 'pro' | 'business' | 'enterprise',
    successUrl: string,
    cancelUrl: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<CentralResponse<{ url: string; sessionId: string }>> {
    return centralFetch<{ url: string; sessionId: string }>('/payments/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ mode: 'subscription', tierId, billingCycle, successUrl, cancelUrl })
    });
  },

  /**
   * Create checkout session for a one-time credit pack purchase
   */
  async purchaseCredits(
    productId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CentralResponse<{ url: string; sessionId: string }>> {
    return centralFetch<{ url: string; sessionId: string }>('/payments/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ mode: 'payment', productId, successUrl, cancelUrl })
    });
  },

  /**
   * NOT YET IMPLEMENTED - no real cross-origin-safe billing portal endpoint
   * exists yet. Calling this will return a clear error rather than silently
   * fail against a route that doesn't exist.
   */
  async getBillingPortal(_returnUrl: string): Promise<CentralResponse<{ url: string }>> {
    return { success: false, error: 'Billing portal endpoint not yet built', code: 'NOT_IMPLEMENTED' };
  },

  /**
   * NOT YET IMPLEMENTED - the only existing billing status endpoint
   * (/api/customer/billing) authenticates via same-origin cookies only and
   * cannot serve cross-origin satellite app requests. A real, token-based
   * equivalent needs to be built before this can work.
   */
  async getSubscription(): Promise<CentralResponse<{
    plan: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  }>> {
    return { success: false, error: 'Subscription status endpoint not yet built', code: 'NOT_IMPLEMENTED' };
  }
};

// ============================================================================
// SUPPORT
// ============================================================================

export const CentralSupport = {
  /**
   * Create support ticket
   */
  async createTicket(
    subject: string,
    description: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    appId?: string
  ): Promise<CentralResponse<Ticket>> {
    return centralFetch<Ticket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, description, priority, app_id: appId })
    });
  },

  /**
   * Get user's tickets
   */
  async getTickets(status?: string): Promise<CentralResponse<Ticket[]>> {
    const params = status ? `?status=${status}` : '';
    return centralFetch<Ticket[]>(`/support/tickets${params}`);
  },

  /**
   * Get single ticket
   */
  async getTicket(ticketId: string): Promise<CentralResponse<Ticket>> {
    return centralFetch<Ticket>(`/support/tickets/${ticketId}`);
  },

  /**
   * Add reply to ticket
   */
  async replyToTicket(ticketId: string, message: string): Promise<CentralResponse<void>> {
    return centralFetch<void>(`/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  },

  /**
   * NOT YET IMPLEMENTED - /api/support/kb/search does not exist yet
   * (confirmed 404 against the real repo, 2026-07-31).
   */
  async searchKnowledgeBase(_query: string): Promise<CentralResponse<any[]>> {
    return { success: false, error: 'Knowledge base search endpoint not yet built', code: 'NOT_IMPLEMENTED' };
  }
};

// ============================================================================
// ENHANCEMENTS (Feature Requests)
// ============================================================================

export const CentralEnhancements = {
  /**
   * Submit enhancement request
   */
  async submit(
    title: string,
    description: string,
    appId?: string
  ): Promise<CentralResponse<Enhancement>> {
    return centralFetch<Enhancement>('/enhancements', {
      method: 'POST',
      body: JSON.stringify({ title, description, app_id: appId })
    });
  },

  /**
   * Get all enhancements
   */
  async getAll(status?: string, appId?: string): Promise<CentralResponse<Enhancement[]>> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (appId) params.set('app_id', appId);
    const queryString = params.toString();
    return centralFetch<Enhancement[]>(`/enhancements${queryString ? '?' + queryString : ''}`);
  },

  /**
   * Vote for enhancement
   */
  async vote(enhancementId: string): Promise<CentralResponse<{ votes: number }>> {
    return centralFetch<{ votes: number }>(`/enhancements/${enhancementId}/vote`, {
      method: 'POST'
    });
  },

  /**
   * Remove vote
   */
  async unvote(enhancementId: string): Promise<CentralResponse<{ votes: number }>> {
    return centralFetch<{ votes: number }>(`/enhancements/${enhancementId}/vote`, {
      method: 'DELETE'
    });
  },

  /**
   * NOT YET IMPLEMENTED - /api/enhancements/roadmap does not exist yet
   * (confirmed 404 against the real repo, 2026-07-31). Use getAll() instead,
   * which does exist and works.
   */
  async getRoadmap(): Promise<CentralResponse<Enhancement[]>> {
    return { success: false, error: 'Roadmap endpoint not yet built - use getAll() instead', code: 'NOT_IMPLEMENTED' };
  }
};

// ============================================================================
// ANALYTICS
// ============================================================================

export const CentralAnalytics = {
  /**
   * Track an event
   */
  async track(
    event: string,
    properties: Record<string, any> = {},
    appId?: string
  ): Promise<void> {
    try {
      await centralFetch('/analytics/track', {
        method: 'POST',
        body: JSON.stringify({
          event,
          properties,
          app_id: appId,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      // Analytics should never block user experience
      console.warn('[CentralServices] Analytics track failed:', error);
    }
  },

  /**
   * Track page view
   */
  async pageView(path: string, appId?: string): Promise<void> {
    await this.track('page_view', { path }, appId);
  },

  /**
   * Track conversion
   */
  async conversion(type: string, value?: number, appId?: string): Promise<void> {
    await this.track('conversion', { type, value }, appId);
  }
};

// ============================================================================
// ACTIVITY (Audit Trail)
// ============================================================================

export const CentralActivity = {
  /**
   * Log an activity
   */
  async log(
    action: string,
    details: Record<string, any> = {},
    appId?: string
  ): Promise<void> {
    try {
      await centralFetch('/activity/log', {
        method: 'POST',
        body: JSON.stringify({
          action,
          details,
          app_id: appId,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('[CentralServices] Activity log failed:', error);
    }
  },

  /**
   * Get user activity history
   */
  async getHistory(limit = 50): Promise<CentralResponse<any[]>> {
    return centralFetch<any[]>(`/activity/history?limit=${limit}`);
  }
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const CentralNotifications = {
  /**
   * Get user notifications
   */
  async getAll(unreadOnly = false): Promise<CentralResponse<any[]>> {
    return centralFetch<any[]>(`/notifications?unread_only=${unreadOnly}`);
  },

  /**
   * Mark notification as read
   */
  async markRead(notificationId: string): Promise<CentralResponse<void>> {
    return centralFetch<void>(`/notifications/${notificationId}/read`, {
      method: 'POST'
    });
  },

  /**
   * Mark all as read
   */
  async markAllRead(): Promise<CentralResponse<void>> {
    return centralFetch<void>('/notifications/read-all', {
      method: 'POST'
    });
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: {
    email_marketing?: boolean;
    email_updates?: boolean;
    email_tickets?: boolean;
    push_enabled?: boolean;
  }): Promise<CentralResponse<void>> {
    return centralFetch<void>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  }
};

// ============================================================================
// CROSS-SELLING
// ============================================================================

export const CentralCrossSell = {
  /**
   * Get recommended apps/products for user
   */
  async getRecommendations(currentAppId: string): Promise<CentralResponse<any[]>> {
    return centralFetch<any[]>(`/recommendations?app_id=${currentAppId}`);
  },

  /**
   * Track recommendation click
   */
  async trackClick(recommendationId: string, appId: string): Promise<void> {
    await CentralAnalytics.track('recommendation_clicked', { recommendation_id: recommendationId }, appId);
  }
};

// ============================================================================
// APP REGISTRY
// ============================================================================

export const CentralRegistry = {
  /**
   * Get all apps in the ecosystem
   */
  async getApps(): Promise<CentralResponse<any[]>> {
    return centralFetch<any[]>('/registry/apps');
  },

  /**
   * Get app by ID
   */
  async getApp(appId: string): Promise<CentralResponse<any>> {
    return centralFetch<any>(`/registry/apps/${appId}`);
  },

  /**
   * Report app health
   */
  async reportHealth(appId: string, status: 'healthy' | 'degraded' | 'down'): Promise<void> {
    await centralFetch('/registry/health', {
      method: 'POST',
      body: JSON.stringify({ app_id: appId, status, timestamp: new Date().toISOString() })
    });
  }
};

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

export const CentralServices = {
  // Services
  Auth: CentralAuth,
  Credits: CentralCredits,
  Payments: CentralPayments,
  Support: CentralSupport,
  Enhancements: CentralEnhancements,
  Analytics: CentralAnalytics,
  Activity: CentralActivity,
  Notifications: CentralNotifications,
  CrossSell: CentralCrossSell,
  Registry: CentralRegistry,
  
  // Utilities
  isAdmin,
  shouldChargeCredits,
  getCreditCost,
  CREDIT_COSTS,
  ADMIN_EMAILS,
  
  // Config
  API_BASE: CENTRAL_API_BASE,
  DOMAIN: CENTRAL_DOMAIN
};

export default CentralServices;
