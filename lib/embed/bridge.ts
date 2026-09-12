// lib/embed/bridge.ts (@craudioviz/platform-sdk)
// Purpose: an app's side of being embedded on craudiovizai.com/apps/<slug>.
// Date: 2026-09-10
//
// Moved into the SDK on 2026-09-10 from javari-scrapbook, where it was built and
// verified. Every embedded app imports it from here - one copy, not one per app.
// The app keeps its own repo, Vercel project and tables; craudiovizai.com shows it
// inside a page on the site. This module is the contract between the two windows.
//
// SIGN-IN: the platform is the authority. When embedded, this app never keeps a
// session of its own - it asks the parent page for the current access token and
// sends it to its own API as a bearer. Only access tokens cross the boundary,
// never refresh tokens: two windows refreshing one token family would trip
// Supabase's reuse detection and sign the user out everywhere. The parent owns
// refresh; this side just asks again when a token nears expiry.
//
// TRUST: messages are accepted only from window.parent AND an allow-listed
// origin. Frames from anywhere else are refused by the frame-ancestors CSP in
// next.config.js before this code runs.
//
// PROTOCOL (all messages carry { ns: 'javari-embed', v: 1 }):
//   child -> parent  ready | token-request{id} | height{value} | navigate{path}
//                    | login{path} | open{url}
//   parent -> child  token{id?, accessToken, expiresAt}
//
// CR AudioViz AI, LLC · EIN 39-3646201
'use client';

export const NS = 'javari-embed';
export const VERSION = 1;

const PARENT_ORIGINS = new Set([
  'https://craudiovizai.com',
  'https://www.craudiovizai.com',
  'https://javariscrapbook.com',
  'https://www.javariscrapbook.com',
]);
// Core PREVIEW deployments, so an embed can be verified before production. Accepted
// only when this app is itself running on one of this team's preview hosts -
// never on a production host or a custom domain. Environment-free on purpose: an
// SDK cannot rely on the host app inlining NEXT_PUBLIC_* variables.
const PREVIEW_PARENT = /^https:\/\/craudiovizai-[a-z0-9]+-roy-hendersons-projects-1d3d5e94\.vercel\.app$/;
const PREVIEW_SELF = /^[a-z0-9-]+-[a-z0-9]+-roy-hendersons-projects-1d3d5e94\.vercel\.app$/;

/**
 * An app's own branded domain, which the core also serves (javarimarket.com serving
 * Javari Market Oracle, javaristudio.com serving Media Studio, and so on).
 *
 * 2026-09-12: the frame-ancestors policy already allowed those domains to frame an
 * app, but this bridge trusted only craudiovizai.com - so on a branded domain the
 * parent's token was refused and the app showed everyone as signed out, no matter how
 * they signed in. Clicking "sign in" asked the parent to sign in, the parent already
 * was, and nothing changed: a loop with no error anywhere.
 *
 * The app declares its own branded domain (it is the one being served there), the same
 * value its next.config already passes to frameAncestors.
 */
const brandedParents = new Set<string>();

export function trustBrandedParent(domain: string | null | undefined): void {
  const d = (domain ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!d || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return;
  brandedParents.add(`https://${d}`);
  brandedParents.add(`https://www.${d}`);
}

export function isTrustedParentOrigin(origin: string): boolean {
  if (PARENT_ORIGINS.has(origin)) return true;
  if (brandedParents.has(origin)) return true;
  return typeof window !== 'undefined' && PREVIEW_SELF.test(window.location.hostname) && PREVIEW_PARENT.test(origin);
}

export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin access to top threw: we are framed
  }
}

type ChildMessage =
  | { type: 'ready' }
  | { type: 'token-request'; id: string }
  | { type: 'height'; value: number }
  | { type: 'navigate'; path: string }
  | { type: 'login'; path: string }
  | { type: 'open'; url: string };

export function postToParent(message: ChildMessage): void {
  if (!isEmbedded()) return;
  // Nothing sent child -> parent is secret, and the parent validates the source
  // window and origin itself, so '*' is safe here. Tokens flow the other way,
  // with an exact target origin chosen by the parent.
  window.parent.postMessage({ ns: NS, v: VERSION, ...message }, '*');
}

interface TokenReply {
  accessToken: string | null;
  expiresAt: number | null; // epoch seconds
}

let cached: TokenReply | null = null;
const pending = new Map<string, (reply: TokenReply) => void>();
let listening = false;

function listen(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent || !isTrustedParentOrigin(event.origin)) return;
    const data = event.data as { ns?: string; type?: string; id?: string; accessToken?: unknown; expiresAt?: unknown; top?: unknown } | null;
    if (!data || data.ns !== NS) return;

    // 2026-09-12: an embedded app is sized to its full content height, so nothing
    // scrolls INSIDE the frame - the site page does. `position: sticky` therefore did
    // nothing and an app's own navigation scrolled away, leaving no way to change page
    // without scrolling back to the top. The parent now reports how far the frame has
    // scrolled past the top of the viewport; an app pins its bar to that offset.
    if (data.type === 'viewport') {
      if (typeof data.top === 'number' && Number.isFinite(data.top)) {
        document.documentElement.style.setProperty('--embed-scroll-top', `${Math.max(0, Math.round(data.top))}px`);
      }
      return;
    }

    if (data.type !== 'token') return;
    const reply: TokenReply = {
      accessToken: typeof data.accessToken === 'string' && data.accessToken ? data.accessToken : null,
      expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : null,
    };
    cached = reply;
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)?.(reply);
      pending.delete(data.id);
    }
    window.dispatchEvent(new CustomEvent('javari-embed:auth', { detail: { signedIn: !!reply.accessToken } }));
  });
}

/** The parent's current access token, or null when the visitor is signed out. */
export async function parentAccessToken(): Promise<string | null> {
  listen();
  const now = Math.floor(Date.now() / 1000);
  if (cached?.accessToken && cached.expiresAt && cached.expiresAt - 60 > now) return cached.accessToken;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const reply = await new Promise<TokenReply>((resolve) => {
    pending.set(id, resolve);
    postToParent({ type: 'token-request', id });
    window.setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve({ accessToken: null, expiresAt: null });
      }
    }, 4000);
  });
  return reply.accessToken;
}

/** Start listening early so a token pushed on load is not missed. */
export function initBridge(): void {
  listen();
}
