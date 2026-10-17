// Tickets and feature requests are one "Support" section in the sidebar,
// so the two pages share a title. (A plain module, not the client tabs
// file: a Server Component can't read a constant through a client
// boundary.)
export const SUPPORT_PAGE = {
  title: "Support",
  description: "Questions and problems from users, and the features they ask for.",
} as const;
