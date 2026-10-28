"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, FolderOpen, type LucideIcon, Mail, Server } from "lucide-react";
import Card from "@/components/smartly/Card";
import T from "@/components/shared/T";
import { formatLogTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { healthQuery } from "@/queries/system.queries";
import type { ISystemHealth } from "@/types/system.types";

type Tone = "ok" | "warn" | "down" | "unknown";

const DOT: Record<Tone, string> = { ok: "bg-mint-300", warn: "bg-warning-fill", down: "bg-expense-fill", unknown: "bg-ink-faint" };

interface ServiceHealth {
  name: string;
  icon: LucideIcon;
  tone: Tone;
  // English keys, or words already filled in.
  state: string;
  sub: string;
}

const HealthCard = ({ service }: { service: ServiceHealth }) => {
  const Icon = service.icon;
  return (
    <Card className="flex items-start gap-3 px-4 py-3.5">
      <span className="flex size-9.5 shrink-0 items-center justify-center rounded-field bg-emerald-soft text-emerald">
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-small text-ink-muted">
          <T>{service.name}</T>
        </span>
        <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[service.tone])} />
          <T>{service.state}</T>
        </span>
        {service.sub && (
          <span className="text-[12.5px] text-ink-muted">
            <T>{service.sub}</T>
          </span>
        )}
      </span>
    </Card>
  );
};

// What each card says, from GET /admin/system/health.
const servicesFrom = (health: ISystemHealth, t: Translate, locale: Locale): Omit<ServiceHealth, "name" | "icon">[] => {
  const time = (value: string) => formatLogTime(value, { t, locale });
  const { database, email, paymentGateway, storage } = health;
  return [
    database.ok
      ? {
          tone: "ok",
          state: "Working",
          sub: database.latencyMs === null ? time(health.checkedAt) : t("Answered in {ms} ms · {time}", { ms: formatCount(database.latencyMs, locale), time: time(health.checkedAt) }),
        }
      : { tone: "down", state: "Database not answering", sub: t("Checked {time}", { time: time(health.checkedAt) }) },
    !email.configured
      ? { tone: "warn", state: "Not set up", sub: "Add the Resend key on the server" }
      : email.lastSendOk === false
        ? { tone: "down", state: "Last send failed", sub: email.lastSendAt ? t("Tried {time}", { time: time(email.lastSendAt) }) : "" }
        : email.lastSendAt
          ? { tone: "ok", state: "Sending", sub: t("Last email {time}", { time: time(email.lastSendAt) }) }
          : { tone: "ok", state: "Ready", sub: "No email sent since the server started" },
    paymentGateway.configured
      ? { tone: "ok", state: "Connected", sub: "bKash, Nagad, SSLCommerz" }
      : { tone: "warn", state: "Not set up", sub: "Marked paid by hand" },
    storage.writable
      ? { tone: storage.imageHostConfigured ? "ok" : "warn", state: "Working", sub: storage.imageHostConfigured ? "Receipts and files" : "Photos need the image host key" }
      : { tone: "down", state: "Can't save files", sub: t("{folder} is read-only", { folder: storage.path }) },
  ];
};

const SERVICES: { name: string; icon: LucideIcon }[] = [
  { name: "API and database", icon: Server },
  { name: "Email (Resend)", icon: Mail },
  { name: "Payment gateways", icon: CreditCard },
  { name: "File storage", icon: FolderOpen },
];

// Each service the platform leans on, and whether it works. Until the check
// answers, nothing claims a state; if it can't be read, the API is the
// likely cause.
const HealthCards = () => {
  const { data, isError } = useQuery(healthQuery());
  const health = data?.data;
  const { translate, locale } = useLocale();
  const states: Omit<ServiceHealth, "name" | "icon">[] = health
    ? servicesFrom(health, translate, locale)
    : SERVICES.map((_, index) =>
        isError ? (index === 0 ? { tone: "down", state: "Not answering", sub: "The API or its database is down" } : { tone: "unknown", state: "Couldn't check", sub: "" }) : { tone: "unknown", state: "Checking...", sub: "" },
      );

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {SERVICES.map((service, index) => (
        <HealthCard key={service.name} service={{ ...service, ...states[index] }} />
      ))}
    </div>
  );
};

export default HealthCards;
