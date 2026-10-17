"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, FolderOpen, type LucideIcon, Mail, Server } from "lucide-react";
import Card from "@/components/smartly/Card";
import T from "@/components/shared/T";
import { formatLogTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { healthQuery } from "@/queries/system.queries";

type Tone = "ok" | "down" | "unknown";

const DOT: Record<Tone, string> = { ok: "bg-jade", down: "bg-expense-fill", unknown: "bg-ink-faint" };
const TILE: Record<Tone, string> = { ok: "bg-mint-50 text-emerald", down: "bg-expense-soft text-expense", unknown: "bg-surface-sunken text-ink-muted" };

interface ServiceHealth {
  name: string;
  icon: LucideIcon;
  tone: Tone;
  state: string;
  sub: string;
}

// Only the API and its database are checked today. Email, payments and file
// storage get their own checks later (a NEW item in the design notes), so
// they say so instead of claiming a state.
const NOT_CHECKED = { tone: "unknown", state: "Not checked yet", sub: "Coming soon" } as const;

const HealthCard = ({ service }: { service: ServiceHealth }) => {
  const Icon = service.icon;
  return (
    <Card padding="sm" className="flex items-start gap-3">
      <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-md", TILE[service.tone])}>
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-small text-ink-muted">
          <T>{service.name}</T>
        </span>
        <span className="flex items-center gap-2 text-title font-semibold text-ink">
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[service.tone])} />
          <T>{service.state}</T>
        </span>
        <span className="text-small text-ink-muted">
          <T>{service.sub}</T>
        </span>
      </span>
    </Card>
  );
};

// Each service the platform leans on, and whether it answers.
const HealthCards = () => {
  const { data, isError } = useQuery(healthQuery());
  const health = data?.data;
  const { translate } = useLocale();

  const api: ServiceHealth = {
    name: "API and database",
    icon: Server,
    ...(isError || health?.status === "error"
      ? { tone: "down", state: "Not answering", sub: "The API or its database is down" }
      : health
        ? { tone: "ok", state: "Working", sub: translate("Answered in {ms} ms · {time}", { ms: health.latencyMs, time: formatLogTime(health.timestamp, { t: translate }) }) }
        : { tone: "unknown", state: "Checking...", sub: "" }),
  };
  const services: ServiceHealth[] = [
    api,
    { name: "Email (Resend)", icon: Mail, ...NOT_CHECKED },
    { name: "Payment gateways", icon: CreditCard, ...NOT_CHECKED },
    { name: "File storage", icon: FolderOpen, ...NOT_CHECKED },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {services.map((service) => (
        <HealthCard key={service.name} service={service} />
      ))}
    </div>
  );
};

export default HealthCards;
