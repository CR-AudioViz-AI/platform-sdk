// lib/embed/start.ts (@craudioviz/platform-sdk)
// Purpose: the embed bridge for apps that are NOT Next.js (Vite + React Router, etc.).
// Date: 2026-09-10
//
// EmbedBridge (components/embed/EmbedBridge.tsx) is the Next.js version: it reads
// usePathname from next/navigation, which a Vite app does not have. This does the
// same job with no framework dependency - call it once at startup:
//
//   import { startEmbed } from '@craudioviz/platform-sdk/lib/embed/start';
//   startEmbed();
//
// and put EMBED_PREPAINT_SCRIPT's code inline in index.html's <head> so the app's
// own chrome never flashes. Deliberately NOT exported from the package root: the
// root barrel is imported by apps that follow main unpinned, and this file must not
// change what they build.
//
// Behaviour matches EmbedBridge exactly: 'ready' once; content height on every
// resize; links to another origin open in the top window ('open'); links to
// /login or /signup ask the platform to sign in ('login'); every navigation -
// pushState, replaceState, back/forward - is reported ('navigate').
//
// CR AudioViz AI, LLC · EIN 39-3646201
import { initBridge, isEmbedded, postToParent } from './bridge';

const AUTH_PATHS = new Set(['/login', '/signup']);
let started = false;

export function startEmbed(): void {
  if (started || typeof window === 'undefined' || !isEmbedded()) return;
  started = true;

  // Fallback if index.html did not carry the prepaint script: mark now.
  // (the same two effects as EMBED_PREPAINT_SCRIPT, without evaluating a string)
  if (!document.documentElement.hasAttribute('data-embedded')) {
    document.documentElement.setAttribute('data-embedded', '');
    const style = document.createElement('style');
    style.textContent = 'html[data-embedded] [data-app-chrome]{display:none!important}';
    (document.head || document.documentElement).appendChild(style);
  }

  initBridge();
  postToParent({ type: 'ready' });

  let frame = 0;
  const report = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      postToParent({ type: 'height', value: Math.ceil(document.documentElement.scrollHeight) });
    });
  };
  const observer = new ResizeObserver(report);
  observer.observe(document.documentElement);
  if (document.body) observer.observe(document.body);
  report();

  document.addEventListener('click', (e: MouseEvent): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    let url: URL;
    try { url = new URL(anchor.href, window.location.href); } catch { return; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    if (url.origin !== window.location.origin) {
      e.preventDefault();
      postToParent({ type: 'open', url: url.href });
      return;
    }
    if (AUTH_PATHS.has(url.pathname)) {
      e.preventDefault();
      postToParent({ type: 'login', path: window.location.pathname + window.location.search });
    }
  }, true);

  const navigated = (): void => {
    postToParent({ type: 'navigate', path: window.location.pathname + window.location.search });
    report();
  };
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method].bind(history);
    history[method] = ((...args: Parameters<History['pushState']>) => {
      const result = original(...args);
      navigated();
      return result;
    }) as History['pushState'];
  }
  window.addEventListener('popstate', navigated);
  navigated();
}
