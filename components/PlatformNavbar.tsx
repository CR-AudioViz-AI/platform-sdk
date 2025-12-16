'use client'

import React, { useState, useEffect } from 'react'
import { initPlatformAuth, logout, type PlatformUser } from '../lib/platform-auth'
import { getCredits, purchaseCredits, type CreditBalance } from '../lib/platform-credits'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://craudiovizai.com'

interface PlatformNavbarProps {
  appName: string
  appIcon: string
  appColor?: string
  showCredits?: boolean
  showAppSwitcher?: boolean
}

const APPS = [
  { id: 'home', name: 'Home', icon: '🏠', url: PLATFORM_URL },
  { id: 'barrelverse', name: 'CRAVBarrels', icon: '🥃', url: 'https://cravbarrels.com' },
  { id: 'cardverse', name: 'CardVerse', icon: '🃏', url: 'https://cardverse.craudiovizai.com' },
  { id: 'games', name: 'Games', icon: '🎮', url: 'https://games.craudiovizai.com' },
  { id: 'javari', name: 'Javari AI', icon: '🤖', url: 'https://javariai.com' },
]

export function PlatformNavbar({
  appName,
  appIcon,
  appColor = 'amber',
  showCredits = true,
  showAppSwitcher = true,
}: PlatformNavbarProps) {
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [showApps, setShowApps] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const session = await initPlatformAuth()
        if (session) {
          setUser(session.user)
          if (showCredits) {
            const balance = await getCredits(session.access_token)
            setCredits(balance)
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [showCredits])

  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-600 text-amber-100',
    purple: 'bg-purple-600 text-purple-100',
    green: 'bg-green-600 text-green-100',
    blue: 'bg-blue-600 text-blue-100',
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: App Logo + App Switcher */}
        <div className="flex items-center gap-4">
          {showAppSwitcher && (
            <div className="relative">
              <button
                onClick={() => setShowApps(!showApps)}
                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {showApps && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-stone-900 border border-stone-700 rounded-xl shadow-xl py-2">
                  <div className="px-3 py-2 text-xs text-stone-500 uppercase">Switch App</div>
                  {APPS.map(app => (
                    <a
                      key={app.id}
                      href={app.url}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-stone-800 transition-colors"
                    >
                      <span className="text-xl">{app.icon}</span>
                      <span className="text-white">{app.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">{appIcon}</span>
            <span className={`text-xl font-bold text-${appColor}-500`}>{appName}</span>
          </a>
        </div>

        {/* Right: Credits + Profile */}
        <div className="flex items-center gap-4">
          {/* Credits Display */}
          {showCredits && user && credits && (
            <button
              onClick={() => purchaseCredits()}
              className={`flex items-center gap-2 px-3 py-1.5 ${colorClasses[appColor]} rounded-full text-sm font-medium hover:opacity-90 transition-opacity`}
            >
              <span>💎</span>
              <span>{credits.total.toLocaleString()}</span>
            </button>
          )}

          {/* User Profile / Login */}
          {loading ? (
            <div className="w-8 h-8 bg-stone-800 rounded-full animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 hover:bg-stone-800 rounded-lg p-1 transition-colors"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </div>
                )}
              </button>

              {showProfile && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-stone-900 border border-stone-700 rounded-xl shadow-xl py-2">
                  <div className="px-4 py-3 border-b border-stone-700">
                    <div className="font-medium text-white">{user.name || 'User'}</div>
                    <div className="text-sm text-stone-400">{user.email}</div>
                    <div className="mt-1 text-xs text-amber-500 uppercase">{user.plan} Plan</div>
                  </div>
                  <a href={`${PLATFORM_URL}/account`} className="block px-4 py-2 text-stone-300 hover:bg-stone-800">
                    Account Settings
                  </a>
                  <a href={`${PLATFORM_URL}/credits`} className="block px-4 py-2 text-stone-300 hover:bg-stone-800">
                    Manage Credits
                  </a>
                  <a href={`${PLATFORM_URL}/subscriptions`} className="block px-4 py-2 text-stone-300 hover:bg-stone-800">
                    Subscriptions
                  </a>
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-stone-800"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href={`${PLATFORM_URL}/auth/login?return=${encodeURIComponent(window.location.href)}`}
              className={`px-4 py-2 ${colorClasses[appColor]} rounded-lg font-medium hover:opacity-90 transition-opacity`}
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PlatformNavbar
