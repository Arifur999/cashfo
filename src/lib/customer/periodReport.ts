// Server-only reader for Reports' period report; an outage reaches the error
// screen (see readFallback.ts).
import "server-only";
import { cache } from "react";
import type { MoneyFlow } from "@/components/modules/Customer/Dashboard/dashboardWorth";
import { customerApi } from "./apiClient";
import type { SocialEventType } from "./eventsTypes";
import type { LoanActivityKind } from "./api";
import { emptyUnlessOutage } from "./readFallback";

export interface WorthOn {
  day: string;
  parts: { cash: number; savings: number; assets: number; investments: number; pawna: number; dena: number };
  counts: { accounts: number; goals: number; assets: number; investments: number; pawna: number; dena: number };
}

// GET /api/businesses/:id/period-report: the net worth on the day before the
// period and at its end, where the money went, and the period's savings
// goals, loans, assets and events. Amounts in taka.
export interface PeriodReport {
  dateFrom: string;
  dateTo: string;
  worth: { start: WorthOn; end: WorthOn };
  flow: MoneyFlow;
  savings: {
    added: number;
    takenOut: number;
    totalSaved: number;
    completed: number;
    // color: the goal's card colour; missing from an older backend.
    goals: { id: string; name: string; added: number; saved: number; target: number; status: "ACTIVE" | "PAUSED" | "COMPLETED" | "WITHDRAWN"; color?: string }[];
  };
  loans: {
    lent: number;
    borrowed: number;
    gotBack: number;
    repaid: number;
    profitPaid: number;
    profitReceived: number;
    entries: { date: string; contactId: string; name: string; kind: LoanActivityKind; amount: number }[];
  };
  assets: {
    bought: { amount: number; count: number };
    sold: { amount: number; count: number };
    valueEnd: number;
    countEnd: number;
    entries: { date: string; assetId: string; name: string; kind: "BOUGHT" | "SOLD"; amount: number }[];
  };
  events: {
    count: number;
    given: number;
    received: number;
    list: { id: string; title: string; type: SocialEventType; date: string; time: string | null; place: string | null; gave: number; got: number }[];
  };
}

export const getPeriodReport = cache(async (businessId: string, dateFrom: string, dateTo: string): Promise<PeriodReport | null> => {
  try {
    const response = await customerApi.get<PeriodReport>(`/api/businesses/${encodeURIComponent(businessId)}/period-report`, { params: { dateFrom, dateTo } });
    // A backend before Investments sends no investments part: none held.
    const withInvestments = (row: WorthOn): WorthOn => ({ ...row, parts: { ...row.parts, investments: row.parts.investments ?? 0 }, counts: { ...row.counts, investments: row.counts.investments ?? 0 } });
    const report = response.data;
    return { ...report, worth: { start: withInvestments(report.worth.start), end: withInvestments(report.worth.end) } };
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
