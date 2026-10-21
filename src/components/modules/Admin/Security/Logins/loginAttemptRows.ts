import type { LoginAttemptGroup } from "@/lib/loginAttempts";

// A row of the sign-ins list. Attempts are grouped one page at a time, so a
// burst at the top of a later page may have begun on the page before, and
// one at the foot of a page may go on to the next: its count is then only
// what this page holds ("At least 20 tries").
export interface LoginAttemptRow extends LoginAttemptGroup {
  clipped: boolean;
}

interface PageEdges {
  // A newer page comes before this one.
  hasNewer: boolean;
  // An older page comes after it.
  hasOlder: boolean;
}

export const markPageEdges = (groups: LoginAttemptGroup[], { hasNewer, hasOlder }: PageEdges): LoginAttemptRow[] =>
  groups.map((group, index) => ({
    ...group,
    clipped: !group.success && ((index === 0 && hasNewer) || (index === groups.length - 1 && hasOlder)),
  }));
