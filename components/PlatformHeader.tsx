// components/PlatformHeader.tsx — THE site header, for every app
//
// 2026-09-07. components/Navigation.tsx from the core, ported so every app
// renders THE SAME header instead of its own.
//
// ONLY the hrefs were changed - made absolute to craudiovizai.com, because an
// app on its own domain must still lead back to the platform and a relative
// href resolves against the app's host.
//
// An earlier version of this file also had framer-motion stripped out by regex.
// That damaged the JSX, the module stopped parsing, and the export vanished -
// which Next reports as 'PlatformHeader is not exported', a WARNING at build
// time and a 500 at runtime. framer-motion is now declared as an SDK dependency
// instead. Do not run regex over JSX.
//
// `user` is optional: apps render <PlatformHeader /> with no props.

'use client';

// /components/Navigation.tsx
// Global Navigation - CR AudioViz AI
// Responsive header with user menu, credits, and quick actions

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

;
}

export default function PlatformHeader({ user }: { user?: NavigationUser } = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { href: 'https://craudiovizai.com/javari-ai', label: 'Javari AI', icon: '✨' },
    { href: 'https://craudiovizai.com/apps',      label: 'Apps',      icon: '🛠️' },
    { href: 'https://craudiovizai.com/journey',   label: 'Journey',   icon: '🗺️' },
    { href: 'https://craudiovizai.com/games',     label: 'Games',     icon: '🎮' },
    { href: 'https://craudiovizai.com/marketplace', label: 'Market', icon: '🏪' },
    { href: 'https://craudiovizai.com/pricing',   label: 'Pricing',   icon: '💎' },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="https://craudiovizai.com/" className="flex items-center gap-3">
            <img
              src="/javari-logo-128.png"
              alt="Javari AI"
              className="h-9 w-auto"
              loading="eager"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium"
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Credits Badge */}
                <Link
                  href="https://craudiovizai.com/pricing"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-slate-900/30 rounded-lg hover:bg-cyan-100 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <span className="text-cyan-600 dark:text-cyan-400">💳</span>
                  <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    {user.credits.toLocaleString()}
                  </span>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.avatar || user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">
                      {user.name}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
                        >
                          {/* User Info */}
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-cyan-100 dark:bg-slate-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium rounded-full">
                                {user.tier}
                              </span>
                              <span className="text-sm text-gray-500">
                                {user.credits.toLocaleString()} credits
                              </span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-2">
                            <Link
                              href="https://craudiovizai.com/dashboard"
                              className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <span>📊</span> Dashboard
                            </Link>
                            <Link
                              href="https://craudiovizai.com/journey"
                              className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <span>🗺️</span> My Journey
                            </Link>
                            <Link
                              href="https://craudiovizai.com/settings"
                              className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <span>⚙️</span> Settings
                            </Link>
                            <Link
                              href="https://craudiovizai.com/marketplace/sell"
                              className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <span>🏪</span> Seller Dashboard
                            </Link>
                            <Link
                              href="https://craudiovizai.com/support"
                              className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <span>❓</span> Help & Support
                            </Link>
                          </div>

                          {/* Logout */}
                          <div className="border-t border-gray-100 dark:border-gray-700 py-2">
                            <button
                              className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => {
                                // Handle logout
                                setUserMenuOpen(false);
                              }}
                            >
                              <span>🚪</span> Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="https://craudiovizai.com/login"
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="https://craudiovizai.com/signup"
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors"
                >
                  Get Started Free
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-800 py-4"
            >
              <nav className="flex flex-col gap-1">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))}
              </nav>

              {user && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <Link
                    href="https://craudiovizai.com/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 bg-cyan-50 dark:bg-slate-900/30 rounded-lg"
                  >
                    <span className="font-medium text-cyan-700 dark:text-cyan-300">Credits</span>
                    <span className="font-bold text-cyan-700 dark:text-cyan-300">{user.credits.toLocaleString()}</span>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
