'use client';
// components/embed/EmbedBridge.tsx (@craudioviz/platform-sdk)
// Purpose: run an app's side of the craudiovizai.com embed on every page.
// Moved into the SDK on 2026-09-10 from javari-scrapbook. Mount once in the app's
// root layout, next to EMBED_PREPAINT_SCRIPT.
// Date: 2026-09-10
//
// Does nothing when the app is opened directly. When framed by the platform:
//   - reports its height, so the site page sizes the frame and there is ONE
//     scrollbar, the page's, not a box scrolling inside the page
//   - reports the path, so the address bar on craudiovizai.com follows along and
//     a shared link opens the same scrapbook
//   - sends sign-in to the platform's own login (a frame cannot complete Google
//     OAuth, and there must be one session for the whole site)
//   - opens links to other sites in the top window instead of inside the frame,
//     where the platform's own pages would refuse to render (X-Frame-Options)
//
// CR AudioViz AI, LLC · EIN 39-3646201
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initBridge, isEmbedded, postToParent, trustBrandedParent } from '../../lib/embed/bridge';

const AUTH_PATHS = new Set(['/login', '/signup']);

export default function EmbedBridge({ brandedDomain }: { brandedDomain?: string }): null {
  const pathname = usePathname();

  // Registered before the bridge starts listening, so the first token reply from a
  // branded domain is accepted rather than dropped. 2026-09-12
  trustBrandedParent(brandedDomain);

  useEffect(() => {
    if (!isEmbedded()) return;
    trustBrandedParent(brandedDomain);
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
    observer.observe(document.body);
    report();

    const onClick = (e: MouseEvent): void => {
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
    };
    document.addEventListener('click', onClick, true);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!isEmbedded()) return;
    postToParent({ type: 'navigate', path: window.location.pathname + window.location.search });
  }, [pathname]);

  return null;
}
