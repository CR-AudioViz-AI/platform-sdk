'use client'

import React from 'react'

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://craudiovizai.com'

interface App {
  id: string
  name: string
  tagline: string
  icon: string
  url: string
  color: string
  category: string
}

const PLATFORM_APPS: App[] = [
  {
    id: 'barrelverse',
    name: 'CRAVBarrels',
    tagline: 'Discover 22,000+ Premium Spirits',
    icon: '🥃',
    url: 'https://cravbarrels.com',
    color: 'amber',
    category: 'lifestyle',
  },
  {
    id: 'cardverse',
    name: 'CardVerse',
    tagline: 'Collect & Trade Digital Cards',
    icon: '🃏',
    url: 'https://cardverse.craudiovizai.com',
    color: 'purple',
    category: 'games',
  },
  {
    id: 'games',
    name: 'CRAV Games',
    tagline: '1,200+ Free Games',
    icon: '🎮',
    url: 'https://games.craudiovizai.com',
    color: 'green',
    category: 'games',
  },
  {
    id: 'javari',
    name: 'Javari AI',
    tagline: 'Your AI Creative Assistant',
    icon: '🤖',
    url: 'https://javariai.com',
    color: 'blue',
    category: 'productivity',
  },
  {
    id: 'craiverse',
    name: 'CRAIverse',
    tagline: 'Virtual World Experience',
    icon: '🌍',
    url: 'https://craiverse.craudiovizai.com',
    color: 'cyan',
    category: 'social',
  },
]

interface CrossSellBannerProps {
  currentApp: string
  category?: string
  maxItems?: number
  variant?: 'horizontal' | 'vertical' | 'compact'
}

export function CrossSellBanner({
  currentApp,
  category,
  maxItems = 3,
  variant = 'horizontal',
}: CrossSellBannerProps) {
  const otherApps = PLATFORM_APPS
    .filter(app => app.id !== currentApp)
    .filter(app => !category || app.category === category)
    .slice(0, maxItems)

  if (otherApps.length === 0) return null

  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-600 hover:bg-amber-500',
    purple: 'bg-purple-600 hover:bg-purple-500',
    green: 'bg-green-600 hover:bg-green-500',
    blue: 'bg-blue-600 hover:bg-blue-500',
    cyan: 'bg-cyan-600 hover:bg-cyan-500',
  }

  if (variant === 'compact') {
    return (
      <div className="flex gap-2 p-2 bg-stone-800/50 rounded-lg">
        <span className="text-sm text-stone-400">Also try:</span>
        {otherApps.map(app => (
          <a
            key={app.id}
            href={app.url}
            className="text-sm text-amber-400 hover:text-amber-300"
          >
            {app.icon} {app.name}
          </a>
        ))}
      </div>
    )
  }

  if (variant === 'vertical') {
    return (
      <div className="flex flex-col gap-3 p-4 bg-stone-800/50 rounded-xl">
        <h3 className="text-lg font-semibold text-white">Explore More</h3>
        {otherApps.map(app => (
          <a
            key={app.id}
            href={app.url}
            className="flex items-center gap-3 p-3 bg-stone-700/50 rounded-lg hover:bg-stone-600/50 transition-colors"
          >
            <span className="text-2xl">{app.icon}</span>
            <div>
              <div className="font-medium text-white">{app.name}</div>
              <div className="text-sm text-stone-400">{app.tagline}</div>
            </div>
          </a>
        ))}
      </div>
    )
  }

  // Horizontal (default)
  return (
    <div className="flex gap-4 p-4 bg-gradient-to-r from-stone-800 to-stone-900 rounded-xl overflow-x-auto">
      {otherApps.map(app => (
        <a
          key={app.id}
          href={app.url}
          className={`flex items-center gap-3 px-4 py-3 ${colorClasses[app.color]} rounded-lg transition-transform hover:scale-105 whitespace-nowrap`}
        >
          <span className="text-2xl">{app.icon}</span>
          <div>
            <div className="font-medium text-white">{app.name}</div>
            <div className="text-xs text-white/80">{app.tagline}</div>
          </div>
        </a>
      ))}
    </div>
  )
}

export default CrossSellBanner
