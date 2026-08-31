/**
 * config/next.config.base.js — the shared Next configuration.
 *
 * 2026-08-30. Apps spread this rather than copying it:
 *
 *   const base = require('@craudioviz/platform-sdk/config/next.config.base.js');
 *   module.exports = { ...base, /* only what is genuinely app-specific */ };
 *
 * WHY. Upgrading 54 repos from Next 14 to 15 meant 54 separate edits to 54 copies
 * of the same file. With a shared base it is one SDK release and 54 dependency
 * bumps, which tooling can do.
 *
 * WHAT THIS DELIBERATELY DOES NOT SET:
 *
 *   typescript.ignoreBuildErrors and eslint.ignoreDuringBuilds are NOT here, and
 *   not by omission. Seventeen of forty repos shipped with both disabled, hiding
 *   204 real errors — six files that could not parse at all, a service-role key in
 *   a URL query string, and a consent audit trail that had never written a row. A
 *   base config that turns checking off would industrialise exactly that.
 *
 *   Anything that needs a live credential at build time. Seven repos failed with
 *   "supabaseUrl is required" because a route built a client at module scope.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201
 */

/** @type {import('next').NextConfig} */
const base = {
  reactStrictMode: true,

  // The SDK ships raw TypeScript, and Next does not run node_modules through SWC
  // by default — any import carrying a `type` re-export fails the build without
  // this. Every app that consumes the SDK needs it, which is precisely why it
  // belongs here rather than in 54 copies.
  transpilePackages: ['@craudioviz/platform-sdk'],

  // Renamed from experimental.serverComponentsExternalPackages in Next 15. The old
  // key is IGNORED rather than rejected, so javari-admin silently bundled cheerio,
  // undici and csv-parse into its server build while appearing configured.
  serverExternalPackages: [],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.craudiovizai.com' },
    ],
  },

  poweredByHeader: false,
};

module.exports = base;
