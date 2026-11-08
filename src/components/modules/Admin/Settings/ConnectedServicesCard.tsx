"use client";

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { cn } from "@/lib/utils";
import { healthQuery } from "@/queries/system.queries";
import type { ISystemHealth } from "@/types/system.types";

type State = { label: string; tone: "ok" | "warn" | "bad" | "unknown" };

const DOT = { ok: "bg-mint-300", warn: "bg-warning-fill", bad: "bg-expense-fill", unknown: "bg-ink-faint" } as const;
const WORDS = { ok: "text-emerald", warn: "text-warning", bad: "text-expense", unknown: "text-ink-muted" } as const;

const CONNECTED: State = { label: "Connected", tone: "ok" };
const NOT_SET_UP: State = { label: "Not set up", tone: "warn" };

// Each service as the server reports it (an older API reports no SMS).
const SERVICES: { name: string; what: string; state: (health: ISystemHealth) => State }[] = [
  {
    name: "Email",
    what: "Resend · password resets, invites, receipts",
    state: ({ email }) => (!email.configured ? NOT_SET_UP : email.lastSendOk === false ? { label: "Last send failed", tone: "bad" } : CONNECTED),
  },
  { name: "Payments", what: "bKash, Nagad and SSLCommerz", state: ({ paymentGateway }) => (paymentGateway.configured ? CONNECTED : NOT_SET_UP) },
  {
    name: "SMS",
    what: "For payment_failed and other SMS templates",
    state: ({ sms }) => (!sms?.configured ? NOT_SET_UP : sms.lastSendOk === false ? { label: "Last send failed", tone: "bad" } : CONNECTED),
  },
  { name: "File storage", what: "Receipts and ticket attachments", state: ({ storage }) => (storage.writable ? CONNECTED : { label: "Can't save files", tone: "bad" }) },
];

// Which outside services are set up. The keys stay on the server. Only a
// super admin may read the system's health, so the other roles see the
// services without their state.
const ConnectedServicesCard = ({ canCheck }: { canCheck: boolean }) => {
  const titleId = useId();
  const query = useQuery({ ...healthQuery(), enabled: canCheck });
  const health = query.data?.data;

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        <div className="flex flex-col gap-0.5 px-5 pt-4 pb-2.5">
          <h2 id={titleId} className="text-[15px] font-semibold text-ink">
            <T>Connected services</T>
          </h2>
          <span className="text-[12.5px] text-ink-muted">
            <T>Keys are kept on the server, not here. Ask your developer to change them.</T>
          </span>
        </div>
        <ul>
          {SERVICES.map((service) => {
            const state: State = health ? service.state(health) : { label: !canCheck ? "Super admins only" : query.isError ? "Couldn't check" : "Checking...", tone: "unknown" };
            return (
              <li key={service.name} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-divider px-5 py-2.75 text-[13.5px]">
                <span className="w-32.5 shrink-0 font-semibold text-ink">
                  <T>{service.name}</T>
                </span>
                <span className="min-w-0 grow text-ink-soft">
                  <T>{service.what}</T>
                </span>
                <span className={cn("flex items-center gap-1.5 text-[12.5px] font-semibold", WORDS[state.tone])}>
                  <span aria-hidden="true" className={cn("size-1.75 rounded-full", DOT[state.tone])} />
                  <T>{state.label}</T>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </Card>
  );
};

export default ConnectedServicesCard;
