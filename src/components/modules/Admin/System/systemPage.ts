// The four System tabs share one title. (A plain module: a Server Component
// can't read a constant through a client boundary.)
export const SYSTEM_PAGE = {
  title: "System",
  description: "Is everything running, what's switched on, and what broke. Super admins only.",
} as const;
