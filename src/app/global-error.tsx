"use client";

import { Anek_Bangla, Plus_Jakarta_Sans } from "next/font/google";
import { BRAND_NAME } from "@/lib/brand";

// The root layout's faces, with the same variables: that layout (and its
// font classes) is what failed. next/font is compiled at build time into a
// class name and a stylesheet, so it can't fail here either.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const anekBangla = Anek_Bangla({ variable: "--font-anek-bangla", subsets: ["bengali", "latin"] });

// globals.css may not be there, so the palette's light values are written
// out: page, ink, ink-muted, forest (the button, forest-hover under the pointer),
// line-strong and sunken (the secondary link), and the focus ring. The
// button's shadow is shadow-button's.
const STYLES = `
  .ge-body { margin: 0; min-height: 100vh; display: flex; background: #f3f6f4; color: #0e1a16;
    font-family: var(--font-jakarta, system-ui), var(--font-anek-bangla, system-ui), system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .ge-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 48px 24px; text-align: center; }
  .ge-main [lang="bn"] { font-family: var(--font-anek-bangla, system-ui), var(--font-jakarta, system-ui), system-ui, sans-serif; }
  .ge-ref { margin: 0; color: #56655e; font: 500 13px/18px ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
  .ge-title { margin: 0; max-width: 640px; font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -0.02em; }
  .ge-title-bn { margin: 0; font-size: 20px; line-height: 1.3; font-weight: 600; }
  .ge-text { margin: 0; max-width: 560px; color: #56655e; font-size: 16px; line-height: 24px; }
  .ge-actions { margin-top: 12px; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
  .ge-button, .ge-link { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 18px; border-radius: 12px;
    font: inherit; font-size: 16px; font-weight: 600; text-decoration: none; cursor: pointer; }
  .ge-button { border: 0; background: #0b3d2e; color: #ffffff; box-shadow: 0 8px 18px -8px rgba(11, 61, 46, 0.55); }
  .ge-button:hover { background: #145a43; }
  .ge-link { border: 1px solid #7c8882; background: #ffffff; color: #0e1a16; }
  .ge-link:hover { background: #e4ebe7; }
  .ge-button:focus-visible, .ge-link:focus-visible { outline: 2px solid #1f7a5a; outline-offset: 2px; }
`;

// Next.js requires global-error.tsx to render its own <html>/<body> --
// it replaces the root layout entirely, so it can't rely on RootLayout
// (which is what just failed). Keep this minimal and dependency-free so it
// can't itself fail to render: no providers, so no t(), and the words of
// app/error.tsx written out in English, then Bangla.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${anekBangla.variable}`}>
      <head>
        {/* metadata isn't supported here; React puts <title> in the head. */}
        <title>{`Something went wrong | ${BRAND_NAME}`}</title>
        <style>{STYLES}</style>
      </head>
      <body className="ge-body">
        <main className="ge-main">
          {error.digest && (
            <p className="ge-ref">
              Error reference · <span lang="bn">এরর রেফারেন্স</span>: {error.digest}
            </p>
          )}
          <h1 className="ge-title">Something went wrong on our side</h1>
          <p lang="bn" className="ge-title-bn">
            আমাদের দিকে কিছু একটা ভুল হয়েছে
          </p>
          {error.digest ? (
            <>
              <p className="ge-text">Nothing you entered was lost. Try again in a moment; if it keeps happening, send us the reference above and we will look into it.</p>
              <p lang="bn" className="ge-text">
                আপনার লেখা কিছুই হারায়নি। একটু পরে আবার চেষ্টা করুন; বারবার হলে উপরের রেফারেন্সটি আমাদের পাঠান, আমরা দেখব।
              </p>
            </>
          ) : (
            <>
              <p className="ge-text">Try again in a moment; if it keeps happening, tell us what you were doing.</p>
              <p lang="bn" className="ge-text">
                একটু পরে আবার চেষ্টা করুন; বারবার হলে আপনি কী করছিলেন তা আমাদের জানান।
              </p>
            </>
          )}
          <div className="ge-actions">
            <button type="button" className="ge-button" onClick={() => retry()}>
              Try again · <span lang="bn">আবার চেষ্টা করুন</span>
            </button>
            {/* A full page load, which builds the root layout afresh. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="ge-link">
              Go to Home · <span lang="bn">হোমে যান</span>
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
