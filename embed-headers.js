// embed-headers.js (@craudioviz/platform-sdk)
// Purpose: the frame-ancestors policy every embedded app must send.
// Date: 2026-09-10
//
// Plain CommonJS so a next.config.js can require it directly:
//   const { embedSecurityHeaders } = require('@craudioviz/platform-sdk/embed-headers.js');
//   headers: [...embedSecurityHeaders(), ...yourOtherHeaders]
//
// ENFORCED Content-Security-Policy frame-ancestors: only the platform's own origins
// may frame the app (clickjacking protection that still allows the embed). Preview
// builds also allow this team's *.vercel.app previews for verification; production
// never does. X-Frame-Options must NOT be sent alongside it - it cannot allow-list,
// and a browser honouring DENY would refuse the platform too.
const PLATFORM_ORIGINS = [
  "https://craudiovizai.com",
  "https://www.craudiovizai.com",
];

/** @param {{ brandedDomain?: string | null }} [opts] the app's branded domain, which the core serves */
function frameAncestors(opts) {
  const list = ["'self'", ...PLATFORM_ORIGINS];
  const d = opts && opts.brandedDomain;
  if (d) list.push(`https://${d}`, `https://www.${d}`);
  if (process.env.VERCEL_ENV === "preview") list.push("https://*.vercel.app");
  return list.join(" ");
}

/** Headers for next.config.js headers(): [{ source: '/:path*', headers: embedSecurityHeaders(...) }] */
function embedSecurityHeaders(opts) {
  return [{ key: "Content-Security-Policy", value: `frame-ancestors ${frameAncestors(opts)}` }];
}

module.exports = { frameAncestors, embedSecurityHeaders, PLATFORM_ORIGINS };
