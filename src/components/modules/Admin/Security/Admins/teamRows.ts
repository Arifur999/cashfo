import type { IAdminAccount, IAdminInvite } from "@/types/adminAccount.types";

// One line of the admin team: a person with an account, or an invite that
// hasn't been accepted yet.
export type TeamRow = { kind: "admin"; id: string; admin: IAdminAccount } | { kind: "invite"; id: string; invite: IAdminInvite };

// You first, then everyone who can sign in, then the suspended, each by
// name; the open invites last, newest first.
export const teamRows = (admins: IAdminAccount[], invites: IAdminInvite[], currentAdminId: string | null): TeamRow[] => {
  const rank = (admin: IAdminAccount) => (admin.id === currentAdminId ? 0 : admin.status === "ACTIVE" ? 1 : 2);
  const people = [...admins].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const pending = [...invites].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [
    ...people.map((admin): TeamRow => ({ kind: "admin", id: admin.id, admin })),
    ...pending.map((invite): TeamRow => ({ kind: "invite", id: `invite-${invite.id}`, invite })),
  ];
};

// "Only 2 of 5 admins use two-step sign-in": of the admins who can sign in
// (a suspended one can't, an invite has no account yet).
export const twoStepCoverage = (admins: IAdminAccount[]) => {
  const active = admins.filter((admin) => admin.status === "ACTIVE");
  return { using: active.filter((admin) => admin.twoFactorEnabled === true).length, total: active.length };
};
