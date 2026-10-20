// The admin top bar's bell (GET /admin/feed) and search (GET /admin/search).

export type AdminFeedGroup = "MONEY" | "SUPPORT" | "SYSTEM";
export type AdminFeedKind = "PAYMENT_FAILED" | "TICKET_WAITING" | "SECURITY_FLAG" | "SIGN_INS_PAUSED" | "ERRORS";

export interface IAdminFeedItem {
  id: string;
  group: AdminFeedGroup;
  kind: AdminFeedKind;
  data: Record<string, string | number | null>;
  at: string;
  href: string;
}

export interface IAdminFeed {
  // The tabs this admin's role can see; empty hides the bell.
  groups: AdminFeedGroup[];
  data: IAdminFeedItem[];
  unreadCount: number;
}

export interface IAdminSearchPerson {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string | null;
  trialEndsAt: string | null;
}

export interface IAdminSearchPayment {
  id: string;
  name: string | null;
  amount: string;
  currency: string;
  gateway: string;
  status: string;
  createdAt: string;
}

export interface IAdminSearchTicket {
  id: string;
  name: string | null;
  subject: string;
  category: string;
  status: string;
}

export interface IAdminSearchResult {
  people: IAdminSearchPerson[];
  payments: IAdminSearchPayment[];
  tickets: IAdminSearchTicket[];
}
