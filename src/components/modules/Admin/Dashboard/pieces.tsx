"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import PageHeader from "@/components/smartly/PageHeader";
import type { Tone } from "@/components/smartly/tones";
import { dayPart, firstName } from "@/lib/adminDashboard";
import { formatDate } from "@/lib/date";
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

const GREETING = { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" } as const;

// "Good afternoon, Nadia" and today's date.
export function Greeting({ name, hour, line, actions }: GreetingProps) {
  const { translate } = useLocale();
  return <PageHeader title={`${translate(GREETING[dayPart(hour)])}, ${firstName(name)}`} description={`${formatDate(new Date(), "EEEE, d MMMM yyyy")} · ${line}`} actions={actions} />;
}

export type ChipTone = "income" | "expense" | "warning" | "info" | "neutral";

interface KpiProps {
  label: string;
  value: React.ReactNode;
  // A chip beside the note: "+212", "15.4%".
  chip?: { text: string; tone: ChipTone } | null;
  note?: React.ReactNode;
  className?: string;
}

// One figure: label, value, and a chip with a note under it.
export function Kpi({ label, value, chip, note, className }: KpiProps) {
  return (
    <Card padding="none" className={cn("flex flex-col gap-2 px-5 py-4", className)}>
      <span className="text-small text-ink-muted">{label}</span>
      <span className="text-h1 text-ink tabular-nums">{value}</span>
      {(chip || note) && (
        <span className="flex items-center gap-2 text-small text-ink-muted">
          {chip && (
            <Chip tone={chip.tone} size="sm">
              {chip.text}
            </Chip>
          )}
          {note}
        </span>
      )}
    </Card>
  );
}

export interface Attention {
  count: number;
  title: string;
  sub: string;
  link: string;
  href: string;
  icon: React.ReactNode;
  tone: Tone;
}

// "Needs you now": the things waiting on an admin, each a card that links
// to where they are dealt with.
export function NeedsYou({ items }: { items: Attention[] }) {
  const { translate } = useLocale();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="needs-you" className="flex flex-col gap-3">
      <h2 id="needs-you" className="text-title text-ink">
        {translate("Needs you now")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <Card key={item.title} padding="sm" interactive asChild>
            <Link href={item.href} className="flex flex-col gap-2">
              <span className="flex items-center justify-between">
                <IconTile size={32} tone={item.tone}>
                  {item.icon}
                </IconTile>
                <span className="text-h1 text-ink tabular-nums">{item.count}</span>
              </span>
              <span className="text-body font-semibold text-ink">{item.title}</span>
              <span className="text-small text-ink-muted">{item.sub}</span>
              <span className="mt-0.5 flex items-center gap-1 text-small font-semibold text-emerald">
                {item.link}
                <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}

interface SectionProps {
  title: string;
  // "212 new · 47 this week", or a link.
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// A titled card with something small on the right of the title.
export function Section({ title, aside, className, children }: SectionProps) {
  return (
    <Card padding="none" className={cn("flex flex-col gap-3 px-5 py-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title text-ink">{title}</h2>
        {aside && <span className="text-small text-ink-muted">{aside}</span>}
      </div>
      {children}
    </Card>
  );
}

export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-small font-semibold text-emerald hover:underline">
      {children}
    </Link>
  );
}

export interface Bar {
  label: string;
  value: number;
  // Printed above the bar; nothing when left out.
  short?: string;
  highlight?: boolean;
}

// A row of bars, the tallest filling the height.
export function MiniBars({ bars, height = 150, label }: { bars: Bar[]; height?: number; label: string }) {
  const max = Math.max(0, ...bars.map((bar) => bar.value));
  return (
    <div className="flex flex-col gap-1.5">
      <div role="img" aria-label={label} className="flex items-end gap-4 border-b border-line px-2" style={{ height }}>
        {bars.map((bar) => (
          <span key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            {bar.short && <span className="text-caption font-semibold whitespace-nowrap text-ink-2 tabular-nums">{bar.short}</span>}
            <span className={cn("w-full max-w-11.5 rounded-t-[5px]", bar.highlight ? "bg-forest dark:bg-emerald" : "bg-mint-300")} style={{ height: max > 0 ? `${Math.max(2, Math.round((bar.value / max) * (height - (bar.short ? 32 : 8))))}px` : "2px" }} />
          </span>
        ))}
      </div>
      <div className="flex gap-4 px-2">
        {bars.map((bar) => (
          <span key={bar.label} className={cn("flex-1 text-center text-caption", bar.highlight ? "font-semibold text-ink" : "text-ink-muted")}>
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// A note where a section would be, when the role can't read it or the
// call failed.
export function Unavailable({ children }: { children: React.ReactNode }) {
  return <p className="text-small text-ink-muted">{children}</p>;
}
