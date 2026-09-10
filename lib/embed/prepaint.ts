// lib/embed/prepaint.ts (@craudioviz/platform-sdk)
// Purpose: mark an embedded document BEFORE first paint.
// Date: 2026-09-10
//
// Put it first in the app's <head>:
//   <script dangerouslySetInnerHTML={{ __html: EMBED_PREPAINT_SCRIPT }} />
//
// When the page is framed it sets <html data-embedded> and injects the one rule that
// hides the app's own chrome ([data-app-chrome]) - so the app's bar, nav and footer
// never flash inside craudiovizai.com, which draws the site's own around it. Opened
// directly, it does nothing. Self-contained, so no stylesheet edit is needed per app.
export const EMBED_PREPAINT_SCRIPT =
  "(function(){var f;try{f=window.self!==window.top}catch(e){f=true}if(!f)return;" +
  "var d=document.documentElement;d.setAttribute('data-embedded','');" +
  "var s=document.createElement('style');" +
  "s.textContent='html[data-embedded] [data-app-chrome]{display:none!important}';" +
  "(document.head||d).appendChild(s)})()";
