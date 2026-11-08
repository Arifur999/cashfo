"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import Card from "@/components/smartly/Card";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { clockIn, companyTagline, officeState } from "@/lib/customer/helpPage";
import { APP_TIME_ZONE } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { openTicketCount } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { adminHelpQuery } from "@/queries/help.queries";
import { ticketStatsQuery } from "@/queries/ticket.queries";
import HelpPageButton from "./HelpPageButton";
import { officeHoursText } from "./helpPreview";

// The Dhaka clock, read after the page is in the browser (so the server's
// and the browser's first drawing agree) and moved on every minute.
function useDhakaClock() {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  useEffect(() => {
    const tick = () => setNow(clockIn(APP_TIME_ZONE));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

// "What users see now": the Help page's contact card as it stands, saved --
// Open now or Closed now on the Dhaka clock, the ways to reach the company,
// how many video guides are shown -- with the tickets waiting and the page itself.
const HelpPreviewCard = () => {
  const { translate, locale } = useLocale();
  const titleId = useId();
  const help = useQuery(adminHelpQuery()).data?.data;
  const stats = useQuery(ticketStatsQuery()).data?.data;
  const now = useDhakaClock();
  const company = help?.company;
  const state = company && now && company.openDays.length > 0 ? officeState(company, now) : null;
  const waiting = stats ? openTicketCount(stats.statusCounts) : 0;
  const shown = help?.videos.filter((video) => video.shown).length ?? 0;
  const rows: [string, string][] = company
    ? [
        ["Hotline", company.hotline || "—"],
        ["WhatsApp", company.whatsapp || "—"],
        ["Email", company.email || "—"],
        ["Office hours", officeHoursText(company.openDays, company.opensAt, company.closesAt, translate, locale)],
        ["First reply", company.replyHours > 0 ? translate(company.replyHours === 1 ? "About {count} hour" : "About {count} hours", { count: formatCount(company.replyHours, locale) }) : "—"],
        ["Video guides", translate("{shown} of {total} shown", { shown: formatCount(shown, locale), total: formatCount(help.videos.length, locale) })],
      ]
    : [];

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        <div className="flex items-center justify-between gap-2.5 px-4.5 pt-3.5 pb-2.5">
          <h2 id={titleId} className="text-[15px] font-semibold text-ink">
            {translate("What users see now")}
          </h2>
          {state && <span className={cn("rounded-full px-2.25 py-0.5 text-caption font-semibold whitespace-nowrap", state.open ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>{translate(state.open ? "Open now" : "Closed now")}</span>}
        </div>
        {company ? (
          <>
            <div className="flex items-center gap-3 px-4.5 pt-1 pb-3">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-primary text-[17px] font-bold text-primary-foreground">
                {(company.name || "S").slice(0, 1).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col">
                <b className="truncate text-[14.5px] font-semibold text-ink">{company.name || "—"}</b>
                <span className="truncate text-[12.5px] text-ink-muted">{companyTagline(company, locale === "bn")}</span>
              </span>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.75 border-t border-divider px-4.5 pt-2.5 pb-3.5 text-[13px]">
              {rows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-muted">{translate(label)}</dt>
                  <dd className="truncate text-right font-semibold text-ink" title={value}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <SkeletonRows rows={3} avatar={false} />
        )}
        <div className="flex gap-2 border-t border-divider bg-strip px-4.5 py-3">
          <Link
            href="/admin/support"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-input bg-surface text-[13px] font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken"
          >
            {translate("Open tickets")}
            {waiting > 0 && <span className="rounded-full bg-info-soft px-1.5 text-[11.5px] font-bold text-info">{formatCount(waiting, locale)}</span>}
          </Link>
          <HelpPageButton look="card" />
        </div>
      </section>
    </Card>
  );
};

export default HelpPreviewCard;
