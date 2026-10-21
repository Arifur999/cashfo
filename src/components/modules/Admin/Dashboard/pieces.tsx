"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import type { Tone } from "@/components/smartly/tones";
import { dayPart, firstName } from "@/lib/adminDashboard";
import { formatDate } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The small building blocks every role's dashboard is made of.

interface GreetingProps {
  name: string;
  // The hour in the platform's time zone, read on the server.
  hour: number;
  // "here is what needs you today."
  line: string;
  actions?: React.ReactNode;
}

const GREETING = { morning: "Good morning, {name}", afternoon: "Good afternoon, {name}", evening: "Good evening, {name}" } as const;

// "Good afternoon, Nadia" and today's date, under the same page header as
// every other admin page.
export function Greeting({ name, hour, line, actions }: GreetingProps) {
  const { translate, locale } = useLocale();
  const now = new Date();
  // "Saturday, 17 October 2026", with the day, the month and the digits in
  // the reader's language.
  const today = `${translate(formatDate(now, "EEEE"))}, ${toLocaleDigits(formatDate(now, "d"), locale)} ${translate(formatDate(now, "MMMM"))} ${toLocaleDigits(formatDate(now, "yyyy"), locale)}`;
  return <PageHeader title={translate(GREETING[dayPart(hour)], { name: firstName(name) })} description={`${today} · ${line}`} actions={actions} />;
}

// The KPI card is shared with the other admin overviews (Workspaces).
export { default as Kpi, type ChipTone } from "@/components/shared/Kpi";

// A KPI's note when its figure couldn't be loaded (Kpi translates it).
export const COULD_NOT_LOAD = "Couldn't load";

export interface Attention {
  // null when it couldn't be counted: the card stays, with a dash.
  count: number | null;
  title: string;
  sub: string;
  link: string;
  href: string;
  icon: React.ReactNode;
  tone: Tone;
}

// One column per card from xl up, so four cards leave no empty fifth.
const ATTENTION_COLUMNS: Record<number, string> = { 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4" };

// "Needs you now": the things waiting on an admin, each a card that links
// to where they are dealt with. One with nothing waiting stays as a way in,
// in grey, so a quiet day doesn't read as four alarms.
export function NeedsYou({ items }: { items: Attention[] }) {
  const { translate, locale } = useLocale();
  if (items.length === 0) return null;
  const quiet = items.every((item) => item.count === 0);
  return (
    <section aria-labelledby="needs-you" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="needs-you" className="text-title text-ink">
          {translate("Needs you now")}
        </h2>
        {quiet && <p className="text-small text-ink-muted">{translate("Nothing needs you right now.")}</p>}
      </div>
      <div className={cn("grid gap-3 sm:grid-cols-2", ATTENTION_COLUMNS[items.length] ?? "xl:grid-cols-4")}>
        {items.map((item) => {
          // Nothing waiting, or nothing known: no alarm colour.
          const calm = item.count === null || item.count === 0;
          return (
            <Card key={item.title} padding="sm" interactive asChild>
              <Link href={item.href} className="flex flex-col gap-2">
                <span className="flex items-center justify-between">
                  <IconTile size={32} tone={calm ? "neutral" : item.tone}>
                    {item.icon}
                  </IconTile>
                  <span className={cn("text-h1 tabular-nums", calm ? "text-ink-muted" : "text-ink")}>{item.count === null ? "—" : formatCount(item.count, locale)}</span>
                </span>
                <span className="text-body font-semibold text-ink">{item.title}</span>
                <span className="text-small text-ink-muted">{item.count === null ? translate(COULD_NOT_LOAD) : item.sub}</span>
                <span className="mt-0.5 flex items-center gap-1 text-small font-semibold text-emerald">
                  {item.link}
                  <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                </span>
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

interface SectionProps {
  title: string;
  // "212 new · 47 this week", or a link.
  aside?: React.ReactNode;
  // It ends in a SectionTable: the card clips the rows' hover to its corners.
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}

// A titled card with something small on the right of the title; the two
// wrap onto their own lines when the card is narrow.
export function Section({ title, aside, flush = false, className, children }: SectionProps) {
  return (
    <Card padding="none" className={cn("flex flex-col gap-3 px-5 py-4", flush && "overflow-clip", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-title text-ink">{title}</h2>
        {aside && <span className="text-small text-ink-muted">{aside}</span>}
      </div>
      {children}
    </Card>
  );
}

// 44px tall under a finger, like every other control.
export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
      {children}
    </Link>
  );
}

// Rows in a Section keep its 20px inset rather than the list recipe's 16/24px.
export const SECTION_ROW = "px-5 md:px-5";

// A list on the shared list recipes (smartly/list: ListRow, ListHead,
// ListEmpty) filling its Section edge to edge, so a row's hover and focus
// ring span the card. It closes its Section (give the Section `flush`) and
// its rows and head take SECTION_ROW.
export function SectionTable({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="table" aria-label={label} className={cn("-mx-5 -mb-4", className)}>
      {children}
    </div>
  );
}

// The bar chart is shared with the Revenue page.
export { default as MiniBars, type Bar } from "@/components/shared/MiniBars";

// A note where a section would be: nothing to show yet, or a section the
// role can't read.
export function Unavailable({ children }: { children: React.ReactNode }) {
  return <p className="text-small text-ink-muted">{children}</p>;
}

// What a card says when its call failed, so a failure never reads as
// "nothing here".
export function LoadFailed() {
  const { translate } = useLocale();
  return <Unavailable>{translate("Couldn't load this. Refresh to try again.")}</Unavailable>;
}
