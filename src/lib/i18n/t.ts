// Minimal i18n seam. For now this just returns the English string unchanged --
// no language switching yet. Wrapping every user-facing string in t() means
// that when Bangla (Hind Siliguri) support is added later, this function
// becomes a real locale lookup and no call sites need to change.
export function t(text: string): string {
  return text;
}
