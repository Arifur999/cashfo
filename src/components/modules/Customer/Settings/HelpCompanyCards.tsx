"use client";

import { Clock, Globe, Lightbulb, Mail, MapPin, MessageCircle, MessagesSquare, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import Kbd from "@/components/smartly/Kbd";
import { clockIn, companyTagline, DAY_NAME, officeDays, officeState, telHref, webHref, whatsappHref, type HelpCompany } from "@/lib/customer/helpPage";
import { SHORTCUTS } from "@/lib/customer/settingsDisplay";
import { APP_TIME_ZONE } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./boardUi";

// The two brands' marks (lucide carries no brand icons).
const FacebookMark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-brand-facebook">
    <path d="M14 8.5V6.6c0-.8.5-1.1 1.2-1.1H17V2h-2.6C11.6 2 10.5 3.9 10.5 6.4v2.1H8V12h2.5v10H14V12h2.6l.4-3.5z" />
  </svg>
);
export const YoutubeMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="text-brand-youtube">
    <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
    <path d="M10 9v6l5.2-3z" className="fill-white" />
  </svg>
);

// The Dhaka clock, from the server's reading, moved on every minute.
function useDhakaClock(initial: { day: number; minutes: number }) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(clockIn(APP_TIME_ZONE)), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

// "9:00" from "09:00", in the reader's digits.
const clock = (time: string) => time.replace(/^0(\d)/, "$1");

// The SettingsHelp board's side: how to reach the company (from Admin ›
// Settings), the average first reply, ideas, and the keyboard shortcuts.
export function HelpCompanyCards({ company, clock: initialClock, onIdea }: { company: HelpCompany | null; clock: { day: number; minutes: number }; onIdea: () => void }) {
  const { t, fmt, locale } = useLocale();
  const now = useDhakaClock(initialClock);
  const state = company && now ? officeState(company, now) : null;
  const days = company ? officeDays(company.openDays) : [];
  const tagline = company ? companyTagline(company, locale === "bn") : "";
  const daysText = days.map((run) => (run.length > 2 ? t("{first} to {last}", { first: t(DAY_NAME[run[0]]), last: t(DAY_NAME[run[run.length - 1]]) }) : run.map((day) => t(DAY_NAME[day])).join(", "))).join(", ");
  const rows = company
    ? [
        company.hotline && { icon: <Phone />, tone: "bg-mint-50 text-primary", label: "Hotline", value: company.hotline, href: telHref(company.hotline), action: "Call" },
        company.whatsapp && { icon: <MessageCircle />, tone: "bg-income-soft text-income", label: "WhatsApp", value: company.whatsapp, href: whatsappHref(company.whatsapp), action: "Chat", external: true },
        company.email && { icon: <Mail />, tone: "bg-tint-blue text-tint-blue-ink", label: "Email", value: company.email, href: `mailto:${company.email}`, action: "Write" },
        company.openDays.length > 0 && { icon: <Clock />, tone: "bg-warning-soft text-warning", label: "Office hours", value: daysText, sub: t("{from} to {to} (Dhaka time)", { from: toLocaleDigits(clock(company.opensAt), fmt), to: toLocaleDigits(clock(company.closesAt), fmt) }) },
        company.headOffice && { icon: <MapPin />, tone: "bg-page text-ink-2", label: "Head office", value: company.headOffice, place: true },
        company.dhakaOffice && { icon: <MapPin />, tone: "bg-page text-ink-2", label: "Dhaka office", value: company.dhakaOffice, place: true },
      ].filter(Boolean)
    : [];
  const links = company
    ? [
        company.website && { icon: <Globe />, label: "Website", href: webHref(company.website) },
        company.facebook && { icon: <FacebookMark />, label: "Facebook", href: webHref(company.facebook) },
        company.youtube && { icon: <YoutubeMark />, label: "YouTube", href: webHref(company.youtube) },
      ].filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-4 xl:sticky xl:top-4">
      {company && (
        <section aria-labelledby="hp-co" className={cn(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-2.5 px-4.5 pt-4 pb-3">
            <h2 id="hp-co" className="text-[16px] font-semibold text-ink">
              {t("Contact the company")}
            </h2>
            <div className="flex items-center gap-3">
              <span className="flex size-10.5 shrink-0 items-center justify-center rounded-[12px] bg-primary text-[18px] font-bold text-white">{company.name.slice(0, 1).toUpperCase()}</span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[15px] font-semibold text-ink">{company.name}</span>
                {tagline && <span className="text-[12.5px] leading-[1.4] text-ink-muted">{tagline}</span>}
              </span>
            </div>
            {state && company.openDays.length > 0 && (
              <span className={cn("inline-flex h-7 w-fit items-center gap-1.75 rounded-full px-2.75 text-[12.5px] font-semibold whitespace-nowrap", state.open ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
                <span aria-hidden="true" className={cn("size-1.75 rounded-full", state.open ? "bg-income" : "bg-expense")} />
                {t(state.open ? "Open now" : "Closed now")}
                <span className="font-medium">
                  {" · "}
                  {state.open
                    ? t("closes at {time}", { time: toLocaleDigits(clock(state.closesAt), fmt) })
                    : state.opensDay
                      ? state.today
                        ? t("opens today at {time}", { time: toLocaleDigits(clock(state.opensAt), fmt) })
                        : state.tomorrow
                          ? t("opens tomorrow at {time}", { time: toLocaleDigits(clock(state.opensAt), fmt) })
                          : t("opens {day} at {time}", { day: t(DAY_NAME[state.opensDay]), time: toLocaleDigits(clock(state.opensAt), fmt) })
                      : ""}
                </span>
              </span>
            )}
          </div>
          {rows.map(
            (row) =>
              row && (
                <div key={row.label} className={cn("flex gap-3 border-t border-sunken px-4.5", "href" in row && row.href ? "items-center py-2.5" : "items-start py-3")}>
                  <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4", row.tone)}>{row.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-[12px] text-ink-muted">{t(row.label)}</span>
                    <span className={cn("break-words text-ink", "place" in row && row.place ? "text-[13.5px] leading-[1.45] font-medium" : "text-body font-semibold")}>{row.value}</span>
                    {"sub" in row && row.sub && <span className="text-[13px] text-ink-2">{row.sub}</span>}
                  </span>
                  {"href" in row && row.href && (
                    <a href={row.href} {...("external" in row && row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="shrink-0 text-[12.5px] font-semibold whitespace-nowrap text-emerald hover:underline">
                      {t(row.action)}
                    </a>
                  )}
                </div>
              ),
          )}
          {links.length > 0 && (
            <div className="flex gap-2 border-t border-sunken px-4.5 py-3">
              {links.map(
                (link) =>
                  link && (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-line px-2 text-[12.5px] font-semibold text-ink-2 hover:bg-soft-hover [&_svg]:size-3.75">
                      {link.icon}
                      {t(link.label)}
                    </a>
                  ),
              )}
            </div>
          )}
          {(company.legalName || company.tradeLicence) && (
            <p className="border-t border-sunken px-4.5 pt-2.5 pb-3.5 text-[12px] leading-[1.5] text-ink-muted">
              {[company.legalName, company.tradeLicence && t("Trade licence")].filter(Boolean).join(" · ")}{" "}
              {company.tradeLicence && <span className="font-mono text-ink-2">{company.tradeLicence}</span>}
            </p>
          )}
        </section>
      )}

      {company && company.replyHours > 0 && (
        <section aria-labelledby="hp-reply" className={cn(CARD, "flex gap-3 px-4.5 py-4")}>
          <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-soft-wash text-income">
            <MessagesSquare className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.75">
            <span id="hp-reply" className="text-[13px] font-medium text-ink-muted">
              {t("Average reply time")}
            </span>
            <span className="text-[20px] font-bold tracking-[-0.01em] text-ink">{t(company.replyHours === 1 ? "About {count} hour" : "About {count} hours", { count: formatCount(company.replyHours, fmt) })}</span>
            <span className="text-[12.5px] leading-[1.5] text-ink-muted">{t("For the first reply, during office hours. Urgent messages are answered first.")}</span>
          </span>
        </section>
      )}

      <section aria-labelledby="hp-idea" className={cn(CARD, "flex gap-3 p-4")}>
        <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-warning-soft text-warning">
          <Lightbulb className="size-4.5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col items-start gap-1.5">
          <h2 id="hp-idea" className="text-[14.5px] font-semibold text-ink">
            {t("Have an idea?")}
          </h2>
          <span className="text-[12.5px] leading-[1.5] text-ink-muted">{t("Tell us what would make Smartly better for you.")}</span>
          <button type="button" onClick={onIdea} className="w-fit text-small font-semibold text-emerald hover:underline">
            {t("Share an idea")}
          </button>
        </span>
      </section>

      {/* The shortcuts need a keyboard: a phone or tablet has none to press. */}
      <section aria-labelledby="hp-keys" className={cn(CARD, "flex flex-col gap-2.5 p-4 pointer-coarse:hidden")}>
        <h2 id="hp-keys" className="text-[14.5px] font-semibold text-ink">
          {t("Keyboard shortcuts")}
        </h2>
        {[...SHORTCUTS.slice(0, 1), { what: "Search help", key: "/" }, ...SHORTCUTS.slice(1)].map((shortcut) => (
          <span key={shortcut.key} className="flex items-center justify-between gap-2.5 text-[13px] text-ink-2">
            {t(shortcut.what)}
            <Kbd className="rounded-[6px] border-b-2 bg-strip px-2 font-sans text-[12px] font-semibold text-ink">{shortcut.key}</Kbd>
          </span>
        ))}
      </section>
    </div>
  );
}
