// What POST /api/client-errors accepts, and nothing else: the API answers
// 400 to null, a stack trace or any other field. Shaped on the server (the
// action's input comes from the browser, so it is not trusted).
export const CLIENT_ERROR_LIMITS = { message: 500, digest: 64, path: 300 } as const;

export interface ClientErrorReport {
  message: string;
  digest?: string;
  path?: string;
}

// Cut by characters, not UTF-16 units, so an emoji is never split in half.
const cap = (text: string, max: number) => {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join("") : text;
};

// PostgreSQL text can't hold NUL, and the API refuses it.
const clean = (value: unknown) => (typeof value === "string" ? value.replaceAll("\0", "").trim() : "");

export const toClientErrorReport = (input: unknown): ClientErrorReport => {
  const values = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const report: ClientErrorReport = { message: cap(clean(values.message) || "Unknown error", CLIENT_ERROR_LIMITS.message) };

  // A reference cut short would point at the wrong log line, so a longer
  // one is left out.
  const digest = clean(values.digest);
  if (digest && digest.length <= CLIENT_ERROR_LIMITS.digest) {
    report.digest = digest;
  }

  // The pathname only: no query or hash, which can hold a token or an email.
  const path = clean(values.path).split(/[?#]/, 1)[0];
  if (path.startsWith("/") && !path.startsWith("//")) {
    report.path = cap(path, CLIENT_ERROR_LIMITS.path);
  }
  return report;
};
