/**
 * lib/egress-guard.ts
 *
 * One boundary every server-side fetch of a caller-supplied URL must pass.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS IN THE SDK AND NOT IN NINE REPOS
 *
 * CodeQL has 39 open critical `js/request-forgery` findings across the org:
 * javari-marketing 13, javari-mcp-vercel 7, javari-admin 5, javari-realty 4,
 * javari-market 4, javari-spirits 3, javari-verify, javari-scrapbook and
 * javari-forge 1 each. Every one is a server-side fetch whose URL a request can
 * influence.
 *
 * javari-verify already had the correct answer, written 2026-08-23, in
 * lib/net/egress-guard.ts. Copying it into eight more repos would recreate
 * exactly the spread this SDK exists to end — the same mistake the Supabase key
 * accessor was pulled in here to stop. So the guard moves here and javari-verify
 * imports it back.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT DOES
 *
 *   1. Scheme allowlist — http/https only. No file:, gopher:, data:, blob:.
 *   2. Host denylist — RFC1918, loopback, link-local (including the cloud
 *      metadata address 169.254.169.254), CGNAT, IPv6 ULA and ::1, and the
 *      .internal/.local/.localhost suffixes.
 *   3. DNS resolution — the same denylist is applied to every address the name
 *      resolves to, so evil.example.com -> 127.0.0.1 does not walk past a
 *      name-only check.
 *   4. Redirects are followed manually and re-guarded per hop, so a 302 to an
 *      internal address is caught rather than followed.
 *
 * THREE THINGS THE javari-verify ORIGINAL DID NOT DO, ADDED HERE
 *
 *   allowHosts   Pin a fetch to an exact set of hosts. Needed because the worst
 *                finding in the sweep was not "reaches internal network" — it
 *                was javari-scrapbook sending its Unsplash API key in an
 *                Authorization header to whatever host the query string named.
 *                A guard that only blocks private ranges happily hands the key
 *                to attacker.example.com. Pinning is what stops that.
 *
 *   header strip On a cross-host redirect, Authorization/Cookie/API-key headers
 *                are dropped. Same leak by another route: fetch an allowed host
 *                that 302s to the attacker's, and the credential rides along.
 *
 *   timeout      A default 10s AbortSignal. An SSRF target that accepts a
 *                connection and never answers otherwise hangs a serverless
 *                function until its own ceiling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT HONESTLY DOES NOT DO
 *
 * It does not defeat DNS rebinding. The guard resolves the name, then fetch()
 * resolves it again to open the socket; a record that flips between those two
 * moments is not caught by any check at this layer. Closing that needs pinning
 * the connection to the validated address — an undici Agent with a custom
 * `lookup` — which is a bigger change than these findings warrant today. The
 * original file called step 3 "the anti-rebinding step"; it is not, and saying
 * so here is better than a comment that overstates the protection.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201 · 2026-08-29
 * Originally javari-verify/lib/net/egress-guard.ts, 2026-08-23.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export interface GuardVerdict {
  readonly allowed: boolean;
  /** Why it was refused, for the audit trail. Empty when allowed. */
  readonly reason: string;
}

export interface GuardOptions {
  /**
   * Exact hostnames this fetch may reach, case-insensitive. A leading "." means
   * "this domain and its subdomains" (".unsplash.com" allows images.unsplash.com
   * but not evilunsplash.com).
   *
   * Use this whenever the request carries a credential. The private-range checks
   * stop an attacker reading your internal network; only pinning stops them
   * reading your API key.
   */
  readonly allowHosts?: readonly string[];
}

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/** Suffixes that name internal networks by convention. */
const DENIED_HOST_SUFFIXES = ['.internal', '.local', '.localhost', '.cluster.local'];

const DENIED_HOSTNAMES = new Set(['localhost', 'metadata', 'metadata.google.internal']);

/** Headers that must never survive a redirect to a different host. */
const CREDENTIAL_HEADERS = [
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
  'apikey',
  'x-auth-token',
  'x-vault-token',
];

/**
 * Is a literal IP address in a range we must never reach? Covers IPv4 private,
 * loopback, link-local (including the cloud metadata address), CGNAT, and the
 * IPv6 equivalents.
 */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
    const [a, b] = parts;
    if (a === undefined || b === undefined) return true; // malformed -> refuse
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    return false;
  }
  if (kind === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
    // IPv4-mapped IPv6 (::ffff:127.0.0.1) — extract and re-check.
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1] !== undefined) return isBlockedIp(mapped[1]);
    return false;
  }
  return true; // not a valid IP where one was expected -> refuse
}

function hostnameLooksInternal(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (DENIED_HOSTNAMES.has(h)) return true;
  return DENIED_HOST_SUFFIXES.some((suffix) => h.endsWith(suffix));
}

function hostAllowed(hostname: string, allowHosts: readonly string[]): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return allowHosts.some((entry) => {
    const e = entry.toLowerCase().replace(/\.$/, '');
    // A leading dot means "this domain and below". Without it the match is
    // exact, because a substring match here is how ".unsplash.com" would end up
    // allowing "notunsplash.com".
    return e.startsWith('.') ? h === e.slice(1) || h.endsWith(e) : h === e;
  });
}

/**
 * The guard. Call before every outbound fetch, and again for every redirect hop.
 */
export async function guardUrl(rawUrl: string, options: GuardOptions = {}): Promise<GuardVerdict> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'Not a valid URL.' };
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { allowed: false, reason: `Scheme "${url.protocol}" is not allowed; only http and https.` };
  }

  // Credentials in the URL itself (https://user:pass@host/) are refused rather
  // than forwarded. They are never what the caller meant and they are a
  // reliable way to smuggle a value into a log.
  if (url.username !== '' || url.password !== '') {
    return { allowed: false, reason: 'URL carries embedded credentials.' };
  }

  const hostname = url.hostname;

  // Pinning is checked FIRST and independently. A pinned fetch that somehow
  // named an internal host still fails the checks below; a pinned fetch that
  // names any other public host fails here, which is the point.
  if (options.allowHosts !== undefined && !hostAllowed(hostname, options.allowHosts)) {
    return { allowed: false, reason: `Host "${hostname}" is not in this call's allow-list.` };
  }

  if (hostnameLooksInternal(hostname)) {
    return { allowed: false, reason: `Host "${hostname}" names an internal network.` };
  }

  // If the host is already an IP literal, check it directly.
  if (isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) {
      return { allowed: false, reason: `Address ${hostname} is in a private, loopback, or link-local range.` };
    }
    return { allowed: true, reason: '' };
  }

  // Otherwise resolve and check every address the name maps to. A name that
  // resolves to ANY blocked address is refused.
  try {
    const results = await lookup(hostname, { all: true });
    if (results.length === 0) {
      return { allowed: false, reason: `Host "${hostname}" did not resolve.` };
    }
    for (const { address } of results) {
      if (isBlockedIp(address)) {
        return {
          allowed: false,
          reason: `Host "${hostname}" resolves to ${address}, a private or loopback address.`,
        };
      }
    }
    return { allowed: true, reason: '' };
  } catch {
    return { allowed: false, reason: `Could not resolve "${hostname}" to verify it is external.` };
  }
}

function stripCredentialHeaders(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  for (const name of CREDENTIAL_HEADERS) headers.delete(name);
  return { ...init, headers };
}

export class EgressBlockedError extends Error {
  constructor(reason: string) {
    super(`Egress blocked: ${reason}`);
    this.name = 'EgressBlockedError';
  }
}

/**
 * A fetch that guards the initial URL and every redirect hop.
 *
 * Drop-in for the raw fetch() calls the SSRF findings flagged. Follows
 * redirects manually so a 302 to an internal address is caught rather than
 * followed, and drops credential headers the moment the host changes.
 */
export async function guardedFetch(
  rawUrl: string,
  init: RequestInit = {},
  options: GuardOptions & { maxRedirects?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 10_000;

  let current = rawUrl;
  let currentInit = init;
  let originHost: string | null = null;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const verdict = await guardUrl(current, options);
    if (!verdict.allowed) throw new EgressBlockedError(verdict.reason);

    const host = new URL(current).host;
    if (originHost === null) {
      originHost = host;
    } else if (host !== originHost) {
      // Host changed across a redirect: the credential does not travel with it.
      currentInit = stripCredentialHeaders(currentInit);
      originHost = host;
    }

    // Caller-supplied signal wins; otherwise a timeout, so a target that
    // accepts and stalls cannot hold the function open.
    const signal = currentInit.signal ?? AbortSignal.timeout(timeoutMs);

    const response = await fetch(current, { ...currentInit, redirect: 'manual', signal });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location === null) return response;
      current = new URL(location, current).toString();
      continue;
    }
    return response;
  }
  throw new EgressBlockedError(`exceeded ${maxRedirects} redirects.`);
}

/**
 * Make one path or query segment safe to interpolate into a URL you own.
 *
 * The second SSRF class in the sweep is not "any host" — it is a hardcoded host
 * with a caller-supplied segment, e.g.
 *
 *   `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`
 *
 * A ticker of `../../v7/finance/quote` walks to a different endpoint; one
 * containing `?` or `#` truncates the query the code thought it was sending.
 * encodeURIComponent alone is the fix, but it is easy to forget and impossible
 * to see in review, so it gets a name and a home.
 *
 * Pass `pattern` to also assert the shape — a stock ticker is not 400
 * characters of anything.
 */
export function urlSegment(value: string, pattern?: RegExp): string {
  if (pattern !== undefined && !pattern.test(value)) {
    throw new EgressBlockedError(`Value ${JSON.stringify(value.slice(0, 40))} is not an allowed segment.`);
  }
  return encodeURIComponent(value);
}

export default { guardUrl, guardedFetch, isBlockedIp, urlSegment, EgressBlockedError };
