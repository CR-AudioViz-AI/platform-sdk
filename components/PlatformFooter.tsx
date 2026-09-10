// components/PlatformFooter.tsx — THE site footer, for every app
//
// 2026-09-07. Lifted from the footer inside components/AppShell.tsx in the core
// repo, so every app renders the SAME footer rather than none or its own.
//
// Every href is absolute to craudiovizai.com: an app on its own domain must
// still lead back to the platform, and a relative href resolves against the
// app's own host.
//
// next/link is replaced with plain anchors deliberately. Link prefetches and
// routes CLIENT-SIDE, which on another domain means a route that does not exist
// in that app - a 404 instead of a trip to the platform.
//
// Keep in sync with AppShell.tsx in the core. If they drift, the platform looks
// like two companies.

import React from 'react';

export default function PlatformFooter() {
  return (
    <footer style={{ background:"rgba(0,0,0,0.6)", borderTop:"1px solid rgba(255,255,255,0.06)", padding:"40px 20px 24px", marginTop:"auto" }}>
            <div style={{ maxWidth:1200, margin:"0 auto" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:24, marginBottom:32 }}>
                {FOOTER_LINKS.map((col, ci) => (
                  <div key={ci}>
                    <div style={{ color:"#F1F5F9", fontWeight:700, fontSize:"0.75rem", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
                      {col.title}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {col.links.map(lk => (
                        <a key={lk.href} href={lk.href} style={{ color:"#64748B", fontSize:"0.8rem", textDecoration:"none" }}>{lk.l}</a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
    
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <a href="https://craudiovizai.com/chat" style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#00B4D8,#10B981)", color:"#fff", padding:"10px 24px", borderRadius:8, fontWeight:700, textDecoration:"none", fontSize:"0.88rem" }}>
                  🤖 Get Help from Javari AI
                </a>
              </div>
    
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:16, textAlign:"center", color:"#475569", fontSize:"0.7rem", lineHeight:1.9 }}>
                <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:6 }}>
                  {["/terms","/privacy","/cookies","/security","/accessibility","/ai-disclosure"].map(h => (
                    <a key={h} href={h} style={{ color:"#475569", textDecoration:"none" }}>
                      {h.slice(1).replace(/-/g," ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </a>
                  ))}
                </div>
                {shell.affiliateNetworks.length > 0 && (
                  <div style={{ marginBottom:6 }}>
                    Some links on this site are affiliate links. If you buy through one, CR AudioViz AI may
                    earn a commission at no extra cost to you. We participate in the{" "}
                    {shell.affiliateNetworks.join(", ")} affiliate {shell.affiliateNetworks.length === 1 ? "network" : "networks"}.
                    Commission never affects what we recommend.
                  </div>
                )}
                {shell.legalFooter ?? "CR AudioViz AI, LLC · EIN 39-3646201 · Fort Myers, Florida"} · © 2026
                {shell.ageNotice && <div style={{ marginTop:6 }}>{shell.ageNotice}</div>}
              </div>
            </div>
          </footer>
  );
}

export { PlatformFooter };
