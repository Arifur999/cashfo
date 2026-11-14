import type { GroupMemberRole, MemberRole } from "./api";

// Who is looking at a group, and what they may do (the v16 boards' roles):
// the owner is its Admin; a member given access is an Editor (keeps cash,
// adds money entries in their own name) or a Viewer (sees everything,
// changes nothing). The backend enforces every rule; these only keep the
// page from offering what would be refused.

export type GroupAccessLevel = "ADMIN" | "EDITOR" | "VIEWER";

export interface GroupAccess {
  level: GroupAccessLevel;
  // The signed-in account, and the member record it is in this group (the
  // owner's own record for the Admin).
  userId: string;
  selfMemberId: string | null;
  // A member-portal login (it opens only Group Expense).
  portal: boolean;
  // A super admin's read-only "View as customer": nothing is offered.
  readOnly: boolean;
}

// The workspace role the group's membership carries.
export const accessLevelOf = (role: MemberRole): GroupAccessLevel => (role === "OWNER" ? "ADMIN" : role === "ACCOUNTANT" ? "EDITOR" : "VIEWER");

// Members, roles and access, categories, budgets, settings, meals, closing
// a month: the Admin's.
export const canManage = (access: GroupAccess): boolean => access.level === "ADMIN" && !access.readOnly;

// Adding money entries: the Admin, or an Editor with their member record,
// while the group isn't paused.
export const canRecord = (access: GroupAccess, paused: boolean): boolean =>
  !paused && !access.readOnly && (access.level === "ADMIN" || (access.level === "EDITOR" && access.selfMemberId !== null));

// Changing or deleting an entry: the Admin any, an Editor only what they
// added, outside closed months.
export const canTouchEntry = (access: GroupAccess, entry: { createdByUserId?: string | null }, paused: boolean, closed = false): boolean => {
  if (paused || access.readOnly) return false;
  if (access.level === "ADMIN") return true;
  return access.level === "EDITOR" && !closed && !!entry.createdByUserId && entry.createdByUserId === access.userId;
};

// Whose name a new entry may be in: anyone for the Admin, only themself
// for an Editor.
export const mayEnterFor = (access: GroupAccess, memberId: string): boolean => access.level === "ADMIN" || memberId === access.selfMemberId;

// The words for a level, and what it allows (the role chip's tooltip).
export const ACCESS_LABELS: Record<GroupAccessLevel, string> = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Viewer" };
export const ACCESS_HINTS: Record<GroupAccessLevel, string> = {
  ADMIN: "Everything: members, roles, settings, closing months",
  EDITOR: "Adds money entries in their own name, keeps group cash",
  VIEWER: "Sees everything, changes nothing",
};

// A member's role in the Members table: Admin (the owner), Editor, Viewer,
// or a member with no access.
export type MemberAccessRole = GroupAccessLevel | "NONE";
export const memberAccessRole = (member: { isOwner?: boolean; role?: GroupMemberRole }): MemberAccessRole =>
  member.isOwner ? "ADMIN" : member.role === "ACCOUNTANT" ? "EDITOR" : member.role === "VIEWER" ? "VIEWER" : "NONE";
export const MEMBER_ROLE_LABELS: Record<MemberAccessRole, string> = { ...ACCESS_LABELS, NONE: "Member" };
export const MEMBER_ROLE_HINTS: Record<MemberAccessRole, string> = { ...ACCESS_HINTS, NONE: "No access: counted in the costs, no portal" };

// Usernames: 4 to 20 small letters, digits, dot or underscore.
export const USERNAME_PATTERN = /^[a-z0-9._]{4,20}$/;

// The app's password rule, as the backend checks it: 8 to 128 characters
// with a letter and a number.
export function passwordProblem(password: string, again: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use at most 128 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number.";
  if (password !== again) return "The two passwords don’t match.";
  return null;
}

// The strength meter under a new password (the GroupLogin board's four
// bars): 0 too short, 1 weak, 2 okay, 3 good, 4 strong.
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (/[A-Z]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4) as 1 | 2 | 3 | 4;
}
