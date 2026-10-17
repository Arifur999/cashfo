// The five Security tabs share one title. (A plain module: a Server
// Component can't read a constant through a client boundary.)
export const SECURITY_PAGE = {
  title: "Security",
  description: "Who can get into the admin panel, what each person changed, and anything that looks wrong. Super admins only.",
} as const;
