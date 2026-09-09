"use client";

// Next.js requires global-error.tsx to render its own <html>/<body> --
// it replaces the root layout entirely, so it can't rely on RootLayout
// (which is what just failed). Keep this minimal and dependency-free so it
// can't itself fail to render.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: "#666", fontSize: "0.875rem" }}>A critical error occurred. Please try again.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "8px", padding: "8px 16px", borderRadius: "12px", background: "#22c55e", color: "white", border: "none", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
