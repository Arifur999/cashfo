import Link from "next/link";
import T from "@/components/shared/T";
import { formatAmount } from "@/lib/currency";
import { formatDate, formatElapsed } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { getTranslator } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/message";
import { OPEN_TICKET_STATUSES, shortTicketId, TICKET_STATUS_LABEL } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import type { IOwnerBilling, IOwnerStats, IOwnerTicket } from "@/types/owner.types";
import type { TicketStatus } from "@/types/ticket.types";

// The person page's right-hand cards (AdminUserDetail): billing, referrals
// and support, each a white card with its title and a small link.

const CARD = "flex flex-col gap-2.5 rounded-card border border-line-card bg-surface px-4.5 py-4 shadow-card";

function CardHead({ id, title, aside }: { id: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-title text-ink">
        <T>{title}</T>
      </h2>
      {aside}
    </div>
  );
}

const CYCLE: Record<string, string> = { MONTHLY: "a month", YEARLY: "a year" };

// What they pay, when it renews or ends, what they have paid so far and
// the coupon they first used. `billingHref` opens the Billing tab.
export async function OwnerBillingCard({ billing, billingHref }: { billing: IOwnerBilling | null; billingHref?: string }) {
  const { t, locale } = await getTranslator("admin");
  const money = (value: string | null) => formatAmount(value ?? 0, undefined, locale);
  const rows: [string, string][] = [];
  if (billing) {
    if (billing.trialEndsAt && billing.status === "TRIALING") rows.push(["Trial ends", formatDate(billing.trialEndsAt, "d MMM yyyy", "—", locale)]);
    if (billing.renewsOn) rows.push(["Renews", formatDate(billing.renewsOn, "d MMM yyyy", "—", locale)]);
    if (billing.endsOn) rows.push(["Ends", formatDate(billing.endsOn, "d MMM yyyy", "—", locale)]);
    rows.push(["Paid so far", `${money(billing.paidSoFar)} · ${plural(t, billing.paymentCount, "{count} payment", "{count} payments", undefined, locale)}`]);
    if (billing.firstCoupon) rows.push(["Coupon", t("{code} on the first", { code: billing.firstCoupon.code })]);
    if (billing.extraWorkspaceFee) rows.push(["Extra workspace", t("+ {amount} a month", { amount: money(billing.extraWorkspaceFee) })]);
  }
  const free = !billing || billing.cycle === "FREE";

  return (
    <section aria-labelledby="owner-billing" className={CARD}>
      <CardHead
        id="owner-billing"
        title="Billing"
        aside={
          billingHref && (
            <Link href={billingHref} scroll={false} className="text-small font-semibold text-emerald hover:underline">
              <T>Billing tab</T>
            </Link>
          )
        }
      />
      {billing === null ? (
        <p className="text-small text-ink-muted">
          <T>They haven&apos;t used the app yet, so there is no plan to show.</T>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-[22px] leading-[normal] font-bold text-ink tabular-nums">{money(free ? "0" : billing.price)}</span>
            <span className="text-small text-ink-muted">{free ? billing.planName : `${t(CYCLE[billing.cycle] ?? "a month")} · ${billing.planName}`}</span>
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-small">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-muted">{t(label)}</dt>
                <dd className="text-right font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

// The friends they invited, how many bought a plan and what they earned.
export async function OwnerReferralsCard({ stats }: { stats: IOwnerStats }) {
  const { t, locale } = await getTranslator("admin");
  const tiles = [
    { label: "Invited", value: formatCount(stats.referralFriends, locale) },
    { label: "Bought a plan", value: formatCount(stats.referralBought, locale) },
    { label: "Earned", value: formatAmount(stats.referralEarned, undefined, locale) },
  ];
  return (
    <section aria-labelledby="owner-referrals" className={cn(CARD, "gap-2")}>
      <CardHead id="owner-referrals" title="Referrals" />
      <div className="grid grid-cols-3 gap-2 text-center">
        {tiles.map((tile) => (
          <span key={tile.label} className="flex flex-col rounded-sm bg-strip py-2">
            <b className="text-[17px] leading-[normal] font-bold text-ink tabular-nums">{tile.value}</b>
            <span className="text-[11.5px] leading-[normal] text-ink-muted">{t(tile.label)}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

const PRIORITY: Record<string, { label: string; chip: string }> = {
  LOW: { label: "Low", chip: "bg-surface-sunken text-ink-muted" },
  MEDIUM: { label: "Medium", chip: "bg-surface-sunken text-ink-2" },
  HIGH: { label: "High", chip: "bg-expense-soft text-expense" },
  URGENT: { label: "Urgent", chip: "bg-expense-soft text-expense" },
};

// Their tickets: how many are open and closed, and the open ones (up to
// two) as cards, a high or urgent one in red. `ticketsHref` lists them all.
export async function OwnerSupportCard({ support, ticketsHref }: { support: { open: number; closed: number; latest: IOwnerTicket[] }; ticketsHref: string }) {
  const { t, locale } = await getTranslator("admin");
  const open = support.latest.filter((ticket) => OPEN_TICKET_STATUSES.includes(ticket.status as TicketStatus)).slice(0, 2);
  return (
    <section aria-labelledby="owner-support" className={CARD}>
      <CardHead
        id="owner-support"
        title="Support"
        aside={<span className="text-[12.5px] leading-[normal] text-ink-muted">{t("{open} open · {closed} closed", { open: formatCount(support.open, locale), closed: formatCount(support.closed, locale) })}</span>}
      />
      {open.length === 0 ? (
        <p className="text-small text-ink-muted">
          <T>No open tickets.</T>{" "}
          {support.open + support.closed > 0 && (
            <Link href={ticketsHref} className="font-semibold text-emerald hover:underline">
              <T>See their tickets</T>
            </Link>
          )}
        </p>
      ) : (
        open.map((ticket) => {
          const priority = PRIORITY[ticket.priority] ?? PRIORITY.MEDIUM;
          const loud = ticket.priority === "HIGH" || ticket.priority === "URGENT";
          return (
            <Link
              key={ticket.id}
              href={`/admin/support/${ticket.id}`}
              className={cn("flex flex-col gap-1 rounded-field border px-3 py-2.5 transition-colors", loud ? "border-expense-line bg-expense-soft/30 hover:bg-expense-soft/60" : "border-line bg-strip hover:bg-hover")}
            >
              <span className="flex items-center justify-between gap-2 text-[12.5px] leading-[normal]">
                <span className="font-mono font-semibold text-ink">{shortTicketId(ticket)}</span>
                <span className={cn("rounded-full px-1.75 text-[11px] font-semibold", priority.chip)}>{t(priority.label)}</span>
              </span>
              <span className="text-[13.5px] leading-[normal] font-semibold text-ink">{ticket.subject}</span>
              <span className="text-caption text-ink-muted">
                {t(TICKET_STATUS_LABEL[ticket.status as TicketStatus] ?? "Open")} · {formatElapsed(ticket.updatedAt, { t, locale })}
              </span>
            </Link>
          );
        })
      )}
    </section>
  );
}
