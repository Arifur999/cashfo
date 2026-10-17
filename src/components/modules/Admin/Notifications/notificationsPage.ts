// The three notification tabs share one title. (A plain module: a Server
// Component can't read a constant through a client boundary.)
export const NOTIFICATIONS_PAGE = {
  title: "Notifications",
  description: "The emails, SMS and in-app messages the platform sends, and campaigns to groups of users.",
} as const;
