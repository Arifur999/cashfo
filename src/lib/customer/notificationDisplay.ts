import { formatDate, formatMonthName, toDateInputValue } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import { localName, plural, type Translate } from "@/lib/i18n/message";
import type { UserNotification } from "./api";
import { formatCurrency } from "./currency";
import { timeLabel } from "./date";
import { appPath, isClock, isReminderKind, PRAYER_LABEL, reminderHref, type NamazKey } from "./reminderDisplay";

// The kinds of row, each with its own icon and tile colour. "other" is any
// row the app doesn't know yet (a type or event newer than this build).
export type NotificationKind =
  | "budget"
  | "loan"
  | "savings"
  | "announcement"
  | "support"
  | "reminder"
  | "payment"
  | "paymentProblem"
  | "refund"
  | "plan"
  | "referral"
  | "referralLost"
  | "payout"
  | "payoutRejected"
  | "securityOn"
  | "securityOff"
  | "securityAlert"
  | "campaign"
  | "idea"
  | "zakat"
  | "event"
  | "other";

export interface NotificationView {
  kind: NotificationKind;
  title: string;
  body: string;
  // Where a tap goes; null for an announcement, which says it all.
  href: string | null;
}

const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const DAY_MS = 86_400_000;

// Whole days from today (in the app's time zone) to a 'YYYY-MM-DD' day.
function daysUntil(day: string, now: Date): number {
  const today = toDateInputValue(now);
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

// Calendar months from one 'YYYY-MM' to another.
function monthsAhead(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

function loanTitle(name: string, owed: boolean, days: number, t: Translate, locale: FormatLocale): string {
  if (days < 0) return t(owed ? "Payment to {name} is overdue" : "{name}'s payment to you is overdue", { name });
  if (days === 0) return t(owed ? "Payment to {name} is due today" : "{name} should pay you today", { name });
  if (days === 1) return t(owed ? "Payment to {name} is due tomorrow" : "{name} should pay you tomorrow", { name });
  return t(owed ? "Payment to {name} is due in {count} days" : "{name} should pay you in {count} days", { name, count: formatCount(days, locale) });
}

// A habit-area reminder (the scheduler's REMINDER row). data carries
// { kind, targetKey, name, at, prayer?, minutesBefore?, url }: `at` is the
// time of the thing itself (the prayer, Sehri's end, Iftar, the to-do's due
// time, the habit's time), `minutesBefore` how early it was sent, and
// `name` the habit, challenge, book, skill or to-do as the person typed it.
function reminderView(data: UserNotification["data"], t: Translate, locale: FormatLocale): NotificationView {
  const kind = text(data.kind);
  const targetKey = text(data.targetKey);
  const name = text(data.name).trim() || t("Reminder");
  const before = Math.max(0, Number(data.minutesBefore ?? 0) || 0);
  const at = text(data.at);
  const time = isClock(at) ? timeLabel(at, t, locale) : "";
  const count = formatCount(before, locale);
  const href = appPath(data.url) ?? (isReminderKind(kind) ? reminderHref(kind, targetKey) : null);
  const view = (title: string, body: string): NotificationView => ({ kind: "reminder", title, body, href });
  switch (kind) {
    case "NAMAZ": {
      const key = text(data.prayer || targetKey).toLowerCase();
      const prayer = Object.hasOwn(PRAYER_LABEL, key) ? t(PRAYER_LABEL[key as NamazKey]) : name;
      return view(before > 0 ? t("{prayer} in {count} minutes", { prayer, count }) : t("Time for {prayer}", { prayer }), time ? t("{prayer} is at {time}.", { prayer, time }) : "");
    }
    case "RAMADAN":
      if (targetKey === "sehri") return view(before > 0 ? t("Sehri ends in {count} minutes", { count }) : t("Sehri ends now"), time ? t("Sehri ends at {time}.", { time }) : "");
      return view(before > 0 ? t("Iftar in {count} minutes", { count }) : t("Time for Iftar"), time ? t("Iftar is at {time}.", { time }) : "");
    case "TODO":
      if (!time) return view(name, t("A task on your to-do list."));
      return view(name, before > 0 ? t("Due at {time}, in {count} min.", { time, count }) : t("Due now, at {time}.", { time }));
    case "HABIT":
      return view(name, t("Time for your habit."));
    case "CHALLENGE":
      return view(name, t("Time for your challenge."));
    case "BOOK":
      return view(name, t("Time to read."));
    case "SKILL":
      return view(name, t("Time to learn."));
    default:
      return view(name, "");
  }
}

// What the account-level rows (billing, referrals, security) need to word
// themselves: the reader's language, their money and their dates.
interface Words {
  t: Translate;
  // The reader's digits and date style (formatPrefs.ts).
  locale: FormatLocale;
  money: (value: string | number | null | undefined) => string;
  // "28 Oct 2026" in the reader's language; "" for a missing date.
  day: (iso: string | number | null | undefined) => string;
}

// The sentence that closes every "was this you?" security row.
const NOT_YOU = "If this wasn't you, change your password now.";

const PLANS_PATH = "/settings/plans";
// One payment's own page: its receipt once paid, or paying again.
const PAYMENT_PATH = "/settings/plans/checkout";
const REFERRALS_PATH = "/referrals";
const EARNINGS_PATH = "/referrals/earnings";
const WITHDRAWALS_PATH = "/referrals/withdrawals";
const SECURITY_PATH = "/settings/security";
// Ideas are voted on from Help & support.
const IDEAS_PATH = "/settings/help";

// "{a} {b}" when both sentences are there.
const sentences = (...parts: string[]) => parts.filter(Boolean).join(" ");

// A BILLING row (BillingNotices on the backend); null for an event this
// build doesn't know. A paid, failed or lapsed payment opens its own page
// (Checkout: the receipt, or paying again); the rest open Plans.
function billingView(data: UserNotification["data"], { t, money, day }: Words): NotificationView | null {
  const paymentId = text(data.paymentId).trim();
  const ownPage = paymentId && ["PAYMENT_PAID", "PAYMENT_FAILED", "PAYMENT_EXPIRED"].includes(text(data.event));
  const href = ownPage ? `${PAYMENT_PATH}?payment=${encodeURIComponent(paymentId)}` : PLANS_PATH;
  const plan = text(data.planName).trim();
  const amount = money(data.amount);
  const view = (kind: NotificationKind, title: string, body: string): NotificationView => ({ kind, title, body, href });
  switch (data.event) {
    case "PAYMENT_PAID": {
      const until = day(data.periodEnd);
      return view(
        "payment",
        t("Payment received"),
        until ? t("{amount} for {plan}. It's active until {date}.", { amount, plan, date: until }) : t("{amount} for {plan}. It's active now.", { amount, plan }),
      );
    }
    case "PAYMENT_FAILED": {
      const reason = text(data.reason).trim();
      return view("paymentProblem", t("Payment failed"), sentences(t("Your {amount} payment for {plan} didn't go through.", { amount, plan }), reason ? t("Reason: {reason}", { reason }) : ""));
    }
    case "PAYMENT_EXPIRED":
      return view("paymentProblem", t("Payment not completed"), t("Your {amount} checkout for {plan} timed out. You can start it again from Plans.", { amount, plan }));
    case "PAYMENT_REFUNDED": {
      const refunded = !plan
        ? t("{amount} was refunded.", { amount })
        : Number(data.full) === 1
          ? t("Your {amount} payment for {plan} was refunded.", { amount, plan })
          : t("{amount} of your payment for {plan} was refunded.", { amount, plan });
      return view("refund", t("Payment refunded"), sentences(refunded, Number(data.planDropped) === 1 ? t("You're on the Free plan now.") : ""));
    }
    case "PLAN_ENDING": {
      const date = day(data.endsAt);
      if (Number(data.trial) === 1) return view("plan", t("Your {plan} trial ends soon", { plan }), t("It ends on {date}. Choose a plan to keep its features.", { date }));
      return view(
        "plan",
        t("{plan} ends soon", { plan }),
        Number(data.cancelling) === 1 ? t("It ends on {date}, as you asked. You can resume it before then.", { date }) : t("It ends on {date}. Pay for the next period to keep it.", { date }),
      );
    }
    case "PLAN_PAST_DUE":
      return view("plan", t("{plan} payment is overdue", { plan }), t("Pay by {date} to keep your plan.", { date: day(data.graceEndsAt) }));
    case "PLAN_ENDED":
      return view("plan", Number(data.trial) === 1 ? t("Your {plan} trial has ended", { plan }) : t("{plan} has ended", { plan }), t("You're on the Free plan now."));
    default:
      return null;
  }
}

// A REFERRAL row (ReferralNotices): the referrer's commissions, or an
// invited friend's nudge to buy.
function referralView(data: UserNotification["data"], { t, locale, money, day }: Words): NotificationView | null {
  const name = text(data.friendName).trim() || t("Your friend");
  const plan = text(data.planName).trim();
  const amount = money(data.amount);
  const view = (kind: NotificationKind, title: string, body: string, href = EARNINGS_PATH): NotificationView => ({ kind, title, body, href });
  switch (data.event) {
    case "COMMISSION_PENDING":
      return view(
        "referral",
        data.kind === "RENEWAL"
          ? plan
            ? t("{name} renewed {plan}", { name, plan })
            : t("{name} renewed their plan", { name })
          : plan
            ? t("{name} bought {plan}", { name, plan })
            : t("{name} bought a plan", { name }),
        t("You earned {amount}. You can withdraw it from {date}.", { amount, date: day(data.availableAt) }),
      );
    case "COMMISSION_AVAILABLE":
      return view("referral", t("{amount} is ready to withdraw", { amount }), t("Your reward for inviting {name}.", { name }));
    case "COMMISSION_MISSED":
      return view(
        "referralLost",
        t("You missed a reward"),
        Number(data.amount ?? 0) > 0
          ? t("{name} bought a plan, but rewards need a paid plan of your own. You missed {amount}.", { name, amount })
          : t("{name} bought a plan, but rewards need a paid plan of your own.", { name }),
      );
    case "COMMISSION_CANCELLED":
      return view(
        "referralLost",
        t("A reward was cancelled"),
        data.reason === "FRIEND_REFUNDED"
          ? t("{name}'s payment was refunded, so the {amount} reward was cancelled.", { name, amount })
          : t("The {amount} reward for inviting {name} was cancelled.", { name, amount }),
      );
    case "COMMISSION_UNDER_CHECK": {
      // Lines an admin held back from a withdrawal for a second look.
      const count = Number(data.count ?? 0);
      const id = text(data.displayId).trim();
      return view(
        "referralLost",
        t("Some payments are being checked"),
        t(count === 1 ? "We held back {count} payment from {id} to check it. The rest is on its way." : "We held back {count} payments from {id} to check them. The rest is on its way.", {
          count: formatCount(count, locale),
          id,
        }),
        WITHDRAWALS_PATH,
      );
    }
    case "COMMISSION_RELEASED":
      return view("referral", t("{amount} is ready to withdraw again", { amount }), t("We checked {name}'s payment. You can withdraw it now.", { name }));
    case "INVITE_REMINDER": {
      // Sent to the invited friend, whose discount is on Plans.
      const referrer = text(data.referrerFirstName).trim() || t("Your friend");
      const percent = Number(data.friendDiscountPct ?? 0);
      return view(
        "referral",
        t("{name} invited you to a paid plan", { name: referrer }),
        percent > 0 ? t("Get {percent}% off your first plan.", { percent: formatCount(percent, locale) }) : t("See what each plan offers."),
        PLANS_PATH,
      );
    }
    default:
      return null;
  }
}

// A PAYOUT row: the member's withdrawal request moved on.
function payoutView(data: UserNotification["data"], { t, money }: Words): NotificationView | null {
  const amount = money(data.amount);
  const view = (kind: NotificationKind, title: string, body: string): NotificationView => ({ kind, title, body, href: WITHDRAWALS_PATH });
  switch (data.event) {
    case "PAYOUT_APPROVED":
      return view("payout", t("Withdrawal approved"), t("Your {amount} withdrawal is approved and will be sent soon.", { amount }));
    case "PAYOUT_PAID": {
      const trxId = text(data.trxId).trim();
      const sent = t("{amount} was sent to you.", { amount: money(data.paidAmount ?? data.amount) });
      return view("payout", t("Withdrawal sent"), sentences(sent, trxId ? t("Transaction ID: {trxId}", { trxId }) : ""));
    }
    case "PAYOUT_REJECTED": {
      const reason = text(data.reason).trim();
      return view("payoutRejected", t("Withdrawal rejected"), sentences(t("{amount} is back in your balance.", { amount }), reason ? t("Reason: {reason}", { reason }) : ""));
    }
    default:
      return null;
  }
}

// A SECURITY row: two-step sign-in turned on or off, a new device, or
// failed sign-in tries.
function securityView(data: UserNotification["data"], { t, locale }: Words): NotificationView | null {
  const view = (kind: NotificationKind, title: string, body: string): NotificationView => ({ kind, title, body, href: SECURITY_PATH });
  const place = text(data.country).trim() || text(data.ipAddress).trim();
  switch (data.event) {
    case "TWO_STEP_ON":
      return view("securityOn", t("Two-step sign-in is on"), t("Signing in now also needs a code from your authenticator app."));
    case "TWO_STEP_OFF":
      return view("securityOff", t("Two-step sign-in is off"), t(NOT_YOU));
    case "TWO_STEP_OFF_BY_SUPPORT":
      return view("securityOff", t("Support turned off two-step sign-in"), t("Turn it back on in Security once you can."));
    case "NEW_DEVICE": {
      const device = text(data.deviceLabel).trim() || t("A new device");
      return view("securityAlert", t("New sign-in to your account"), sentences(place ? t("{device} in {place}.", { device, place }) : `${device}.`, t(NOT_YOU)));
    }
    case "FAILED_TRIES": {
      const count = Number(data.count ?? 0) || 0;
      const tries = place
        ? plural(t, count, "{count} wrong-password try from {place}.", "{count} wrong-password tries from {place}.", { place }, locale)
        : plural(t, count, "{count} wrong-password try.", "{count} wrong-password tries.", undefined, locale);
      return view("securityAlert", t("Failed sign-in attempts"), sentences(tries, t(NOT_YOU)));
    }
    default:
      return null;
  }
}

// An IDEA row: an idea the reader asked for or voted for was planned or
// shipped.
function ideaView(data: UserNotification["data"], { t }: Words): NotificationView | null {
  if (data.event !== "IDEA_STATUS") return null;
  const title =
    data.status === "SHIPPED" ? t("An idea you voted for is live") : data.status === "PLANNED" ? t("An idea you voted for is planned") : t("An idea you voted for was updated");
  return { kind: "idea", title, body: text(data.title), href: IDEAS_PATH };
}

// Any row the app doesn't know: the words it carries, if any, and the page
// its type belongs to (or a link it carries), so it still reads and opens.
// A reminder about a PIN-locked workspace: that there is one, not what it
// says. Opening it asks for the workspace's PIN.
const LOCKED_HOME: Partial<Record<string, string>> = { BUDGET: "/budget-planning", LOAN_DUE: "/loan-management", SAVINGS: "/savings-goals/dashboard", ZAKAT: "/zakat", EVENT: "/events" };

function lockedView(item: UserNotification, t: Translate): NotificationView {
  return { kind: "other", title: t("A reminder in a PIN-locked workspace"), body: t("Enter its PIN to see it."), href: LOCKED_HOME[item.type] ?? null };
}

function otherView(item: UserNotification, t: Translate): NotificationView {
  const data = item.data ?? {};
  const typeHome: Partial<Record<string, string>> = { BILLING: PLANS_PATH, REFERRAL: REFERRALS_PATH, PAYOUT: WITHDRAWALS_PATH, SECURITY: SECURITY_PATH, IDEA: IDEAS_PATH };
  return {
    kind: "other",
    title: text(data.title).trim() || t("You have a new notification"),
    body: text(data.body),
    href: appPath(data.url) ?? typeHome[item.type] ?? null,
  };
}

// A row's words, built from its data in the reader's language, counts and
// percentages in the reader's digits. `currency` is the currency of the
// workspace it is about. Never throws: a row it can't word (a type or event
// newer than this build, or data it didn't expect) reads as a plain
// notification, so one odd row can't take the whole page down.
export function notificationView(item: UserNotification, t: Translate, locale: FormatLocale, currency = "BDT", now: Date = new Date()): NotificationView {
  if (item.locked) return lockedView(item, t);
  try {
    return knownView(item, t, locale, currency, now) ?? otherView(item, t);
  } catch {
    return otherView(item, t);
  }
}

function knownView(item: UserNotification, t: Translate, locale: FormatLocale, currency: string, now: Date): NotificationView | null {
  const data = item.data ?? {};
  const money = (value: string | number | null | undefined) => formatCurrency(Number(value ?? 0) || 0, currency, locale);
  const words: Words = { t, locale, money, day: (iso) => (iso ? formatDate(iso, "d MMM yyyy", "", locale) : "") };
  const percentOf = (value: string | number | null | undefined) => formatCount(Number(value ?? 0), locale);
  const thisMonth = toDateInputValue(now).slice(0, 7);
  // A month named in a sentence. One that isn't within the coming year (a
  // goal due in January two years on, or a date gone by) carries its year,
  // so "by January" is never the wrong January.
  const monthOf = (key: string, yearIfFar = false) => {
    const month = key.slice(0, 7);
    const ahead = monthsAhead(thisMonth, month);
    const name = t(formatMonthName(month));
    return yearIfFar && (ahead < 0 || ahead > 11) ? `${name} ${toLocaleDigits(month.slice(0, 4), locale)}` : name;
  };
  switch (item.type) {
    case "BUDGET": {
      const left = Number(data.left ?? 0);
      // The category's Bangla name, once the reminder carries it.
      const category = localName(langOf(locale), { name: text(data.category), nameBn: data.categoryBn === undefined ? null : text(data.categoryBn) });
      const month = monthOf(text(data.month));
      return left < 0
        ? { kind: "budget", title: t("{category} is over its limit", { category }), body: t("{amount} over the limit for {month}.", { amount: money(-left), month }), href: "/budget-planning" }
        : { kind: "budget", title: t("{category} is at {percent}% of its limit", { category, percent: percentOf(data.percent) }), body: t("Only {amount} left for the rest of {month}.", { amount: money(left), month }), href: "/budget-planning" };
    }
    case "LOAN_DUE": {
      const due = text(data.dueDate);
      const contact = encodeURIComponent(text(data.contactId));
      return {
        kind: "loan",
        title: loanTitle(text(data.name), data.direction === "PAYABLE", daysUntil(due, now), t, locale),
        body: t("{amount} on {date}.", { amount: money(data.amount), date: formatDate(`${due}T00:00:00Z`, "EEE, d MMM", "—", locale) }),
        href: Number(data.loan) === 1 ? `/loan-management/ledger?contactId=${contact}` : `/contacts/${contact}`,
      };
    }
    case "SAVINGS": {
      const goal = text(data.goal);
      return {
        kind: "savings",
        title: t("Savings check-in for {month}", { month: monthOf(text(data.month)) }),
        body:
          Number(data.behind) === 1
            ? t("{goal} is behind. Save {amount} a month to reach it by {month}.", { goal, amount: money(data.perMonth), month: monthOf(text(data.targetDate), true) })
            : t("{goal} is on track: {percent}% saved.", { goal, percent: percentOf(data.percent) }),
        href: "/savings-goals/dashboard",
      };
    }
    case "SUPPORT_REPLY":
      // The body is the admin's Support reply wording when that template is
      // on (already in the reader's language), else the ticket's subject.
      return { kind: "support", title: t("Support replied to your message"), body: text(data.body).trim() || text(data.subject), href: `/settings/help?message=${encodeURIComponent(text(data.ticketId))}` };
    case "ANNOUNCEMENT": {
      const bangla = langOf(locale) === "bn";
      return {
        kind: "announcement",
        title: text(bangla && text(data.titleBn).trim() ? data.titleBn : data.title),
        body: text(bangla && text(data.bodyBn).trim() ? data.bodyBn : data.body),
        href: null,
      };
    }
    case "REMINDER":
      return reminderView(data, t, locale);
    case "BILLING":
      return billingView(data, words);
    case "REFERRAL":
      return referralView(data, words);
    case "PAYOUT":
      return payoutView(data, words);
    case "SECURITY":
      return securityView(data, words);
    case "IDEA":
      return ideaView(data, words);
    case "EVENT": {
      // The day before an event with its reminder on: its name, then
      // when (Tomorrow, or its day once that has passed) and where.
      const date = text(data.date);
      const days = daysUntil(date, now);
      const at = text(data.time);
      const time = isClock(at) ? timeLabel(at, t, locale) : "";
      const day = days === 1 ? t("Tomorrow") : days === 0 ? t("Today") : formatDate(`${date}T00:00:00Z`, "EEE, d MMM", "—", locale);
      const when = time ? t("{day} at {time}", { day, time }) : day;
      const place = text(data.place).trim();
      return { kind: "event", title: text(data.title).trim() || t("An event"), body: place ? `${when} · ${place}` : when, href: appPath(data.url) ?? "/events" };
    }
    case "ZAKAT": {
      // 30 and 3 days before the zakat date, while some is left to give.
      const due = text(data.dueDate);
      const days = daysUntil(due, now);
      return {
        kind: "zakat",
        title:
          days < 0
            ? t("Your zakat date has passed")
            : days === 0
              ? t("Your zakat is due today")
              : days === 1
                ? t("Your zakat is due tomorrow")
                : plural(t, days, "Your zakat is due in {count} day", "Your zakat is due in {count} days", undefined, locale),
        body: t("{amount} left to give by {date}.", { amount: money(data.left), date: words.day(due) }),
        href: "/zakat",
      };
    }
    case "CAMPAIGN":
      // Worded by the team, already in the reader's language.
      return { kind: "campaign", title: text(data.title).trim() || t("You have a new notification"), body: text(data.body), href: appPath(data.url) };
    default:
      return null;
  }
}

// "12 min ago" within the hour, "11:20 am" later today, "Yesterday", then
// "Thu, 1 Oct" (or "2 Jun 2025" from another year), as the board dates them.
// The minutes are a count and the dates are the reader's, so a Bangla
// reader gets Bangla digits and month names.
export function notificationTime(iso: string, t: Translate, locale: FormatLocale = "en", now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t("just now");
  if (minutes < 60) return t("{count} min ago", { count: formatCount(minutes, locale) });
  const day = toDateInputValue(iso);
  const today = toDateInputValue(now);
  if (day === today) return formatDate(iso, "h:mm aaa", "—", locale);
  if (day === toDateInputValue(new Date(now.getTime() - DAY_MS))) return t("Yesterday");
  return formatDate(iso, day.slice(0, 4) === today.slice(0, 4) ? "EEE, d MMM" : "d MMM yyyy", "—", locale);
}
