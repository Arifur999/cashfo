// The four content tabs share one title. (A plain module: a Server
// Component can't read a constant through a client boundary.)
export const CONTENT_PAGE = {
  title: "Content",
  description: "What users read in the app: banners, legal pages, every word in both languages, and the starting categories.",
} as const;
