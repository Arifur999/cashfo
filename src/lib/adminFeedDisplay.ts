import type { IAdminFeedItem } from "@/types/adminFeed.types";
import type { SuspiciousActivityType } from "@/types/securityFlag.types";
import { formatAmount } from "./currency";
import { formatDate } from "./date";
import { formatCount } from "./i18n/digits";
import { inEnglish, plural, type Translate } from "./i18n/message";
import type { Locale } from "./i18n/translate";
import { FLAG_TYPE_LABEL } from "./securityFlags";
import { humanizeEnum } from "./statusBadge";
import { shortTicketId } from "./tickets";

// The tile beside a row: red for money lost or a security flag, blue for a
// customer waiting, amber for paused sign-ins and money waiting on an
// admin (a payout to review, a payment not through yet), grey for errors.
export type AdminFeedTone = "expense" | "info" | "warning" | "neutral";

export interface AdminFeedRow {
  title: string;
  body: string;
  tone: AdminFeedTone;
}

const HOUR_MS = 60 * 60 * 1000;
const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

// "Ticket #4F2A1 waiting 6 hours", or days once it is past two.
function waitingTitle(ticketId: string, since: string, now: Date, t: Translate, locale: Locale): string {
  const hours = Math.max(1, Math.floor((now.getTime() - new Date(since).getTime()) / HOUR_MS));
  const id = shortTicketId(ticketId);
  return hours < 48
    ? plural(t, hours, "Ticket {id} waiting {count} hour", "Ticket {id} waiting {count} hours", { id }, locale)
    : plural(t, Math.floor(hours / 24), "Ticket {id} waiting {count} day", "Ticket {id} waiting {count} days", { id }, locale);
}

// A feed row's words, in the reader's language, as the board writes them;
// `locale` puts its counts and times in the reader's digits too.
export function adminFeedRow(item: IAdminFeedItem, t: Translate = inEnglish, now: Date = new Date(), locale: Locale = "en"): AdminFeedRow {
  const data = item.data;
  switch (item.kind) {
    case "PAYMENT_FAILED":
      return {
        title: t("Payment failed: {name}", { name: text(data.name) || t("a customer") }),
        body: [text(data.plan), data.gateway ? humanizeEnum(text(data.gateway)) : "", text(data.reason)].filter(Boolean).join(" · "),
        tone: "expense",
      };
    case "PAYMENT_PENDING":
      return {
        title: t("Payment waiting: {name}", { name: text(data.name) || t("a customer") }),
        body: [text(data.plan), data.gateway ? humanizeEnum(text(data.gateway)) : "", data.amount ? formatAmount(text(data.amount), undefined, locale) : ""].filter(Boolean).join(" · "),
        tone: "warning",
      };
    case "PAYOUT_REQUESTED":
      return {
        title: t(data.status === "APPROVED" ? "Payout to send: {name}" : "Payout request: {name}", { name: text(data.name) || t("a customer") }),
        body: [text(data.displayId), data.amount ? formatAmount(text(data.amount), undefined, locale) : "", data.method ? humanizeEnum(text(data.method)) : ""].filter(Boolean).join(" · "),
        tone: "warning",
      };
    case "TICKET_WAITING":
      return { title: waitingTitle(text(data.ticketId), text(data.since), now, t, locale), body: `${t(humanizeEnum(text(data.category)))} · "${text(data.subject)}"`, tone: "info" };
    case "SECURITY_FLAG":
      return { title: t("Security flag: {what}", { what: t(FLAG_TYPE_LABEL[data.type as SuspiciousActivityType] ?? "Something else") }), body: text(data.description), tone: "expense" };
    case "SIGN_INS_PAUSED":
      return {
        title: t("Sign-ins paused for {email}", { email: text(data.email) }),
        body: t("Too many tries from {ip}; open again at {time}", { ip: text(data.ipAddress), time: formatDate(text(data.until), "h:mm aaa", "—", locale) }),
        tone: "warning",
      };
    case "ERRORS": {
      const count = Number(data.count ?? 0);
      const high = Number(data.high ?? 0);
      // A request path as it is ("/api/reports"), else the source's name.
      const top = text(data.top);
      const source = top.startsWith("/") ? top : top && humanizeEnum(top);
      return {
        title: plural(t, count, "{count} new error in 24 hours", "{count} new errors in 24 hours", undefined, locale),
        body: [high > 0 ? t("{count} high", { count: formatCount(high, locale) }) : "", source ? t("most from {source}", { source }) : ""].filter(Boolean).join(" · "),
        tone: "neutral",
      };
    }
  }
}
