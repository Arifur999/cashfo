import { isAxiosError } from "axios";
import { ContentDashboard, type ContentDashboardData } from "@/components/modules/Admin/Dashboard/ContentDashboard";
import { queueOrder } from "@/components/modules/Admin/Dashboard/dashboardFigures";
import { FinanceDashboard, type FinanceDashboardData } from "@/components/modules/Admin/Dashboard/FinanceDashboard";
import { SuperDashboard, type SuperDashboardData } from "@/components/modules/Admin/Dashboard/SuperDashboard";
import { SupportDashboard, type SupportDashboardData } from "@/components/modules/Admin/Dashboard/SupportDashboard";
import type { SystemState } from "@/components/modules/Admin/Dashboard/SystemCard";
import { hourIn } from "@/lib/adminDashboard";
import { getAnalyticsSummary } from "@/services/analytics.services";
import { getAnnouncements } from "@/services/announcement.services";
import { getUserInfo } from "@/services/auth.services";
import { getCategories } from "@/services/category.services";
import { getDashboardSummary } from "@/services/dashboard.services";
import { getFeatureRequests } from "@/services/featureRequest.services";
import { getLegalDocuments } from "@/services/legalDocument.services";
import { getPayments } from "@/services/payment.services";
import { getPlanAnalytics, getPlans } from "@/services/plan.services";
import { getChurn, getRevenueOverview, getRevenueSummary } from "@/services/revenue.services";
import { getBackupStatusSummary, getErrorLogs, getHealth } from "@/services/system.services";
import { getTickets, getTicketStats } from "@/services/ticket.services";
import { getTranslations } from "@/services/translation.services";
import type { IAdminUser } from "@/types/auth.types";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Dashboard");

// Each role's dashboard only reads what that role may, so a call that fails
// here is an outage or a timeout. It comes back as null, and its card says
// it couldn't load: it never fails the whole page, and never reads as
// "nothing here" or "all clear".
async function maybe<T>(call: () => Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await call()).data;
  } catch {
    return null;
  }
}

// The total behind a paginated list, without the rows.
async function countOf(call: () => Promise<{ meta?: { total: number } }>): Promise<number | null> {
  try {
    return (await call()).meta?.total ?? null;
  } catch {
    return null;
  }
}

// One page of a list and the total behind it.
async function pageOf<T>(call: () => Promise<{ data: T[]; meta?: { total: number } }>): Promise<{ rows: T[]; total: number } | null> {
  try {
    const { data, meta } = await call();
    return { rows: data, total: meta?.total ?? data.length };
  } catch {
    return null;
  }
}

// The API's health check, timed from this server. A 503 carrying the
// check's own answer is the API up and its database down; no answer at all
// is the API itself down.
async function healthOf(): Promise<Pick<SystemState, "healthy" | "latencyMs">> {
  try {
    const { data } = await getHealth();
    return data.status === "ok" ? { healthy: true, latencyMs: data.latencyMs } : { healthy: false, latencyMs: null };
  } catch (error) {
    const answered = isAxiosError(error) && error.response?.status === 503 && (error.response.data as { status?: string } | undefined)?.status === "error";
    return { healthy: answered ? false : null, latencyMs: null };
  }
}

async function superData(): Promise<SuperDashboardData> {
  const [{ data: summary }, activity, tickets, failedPayments, revenue, overview, plans, planList, health, backup, unresolvedErrors] = await Promise.all([
    getDashboardSummary(),
    maybe(getAnalyticsSummary),
    maybe(getTicketStats),
    countOf(() => getPayments("limit=1", "failed")),
    maybe(getRevenueSummary),
    // The MRR's change, month end to month end.
    maybe(getRevenueOverview),
    maybe(getPlanAnalytics),
    maybe(getPlans),
    healthOf(),
    maybe(getBackupStatusSummary),
    // Not fixed yet, from the last 24 hours: the card links to the Errors
    // page on that same window (?within=24h), so the count and the list agree.
    countOf(() => getErrorLogs("resolved=false&within=24h&limit=1")),
  ]);
  return { summary, activity, tickets, failedPayments, revenue, overview, plans, planList, system: { ...health, backup, unresolvedErrors } };
}

// The API's largest page. Its own order (unassigned first, then newest)
// would leave the longest-waiting tickets out of a short page, so the
// dashboard sorts them itself and shows the first few.
const QUEUE_FETCHED = 100;
const QUEUE_SHOWN = 6;

async function supportData(): Promise<SupportDashboardData> {
  const [stats, open, requests] = await Promise.all([maybe(getTicketStats), pageOf(() => getTickets(`status=OPEN&limit=${QUEUE_FETCHED}`)), maybe(getFeatureRequests)]);
  return { stats, queue: open && { tickets: queueOrder(open.rows).slice(0, QUEUE_SHOWN), total: open.total }, requests, now: Date.now() };
}

async function financeData(): Promise<FinanceDashboardData> {
  const [revenue, overview, churn, plans, planList, failed] = await Promise.all([
    maybe(getRevenueSummary),
    maybe(getRevenueOverview),
    maybe(getChurn),
    maybe(getPlanAnalytics),
    maybe(getPlans),
    pageOf(() => getPayments("limit=5", "failed")),
  ]);
  return { revenue, overview, churn, plans, planList, failed };
}

async function contentData(): Promise<ContentDashboardData> {
  const [translations, announcements, legal, categories] = await Promise.all([maybe(getTranslations), maybe(getAnnouncements), maybe(getLegalDocuments), maybe(getCategories)]);
  return { translations, announcements, legal, categories: categories ? categories.length : null };
}

// Each role gets the dashboard cut to its work; the super admin sees it all.
const DashboardPage = async () => {
  // getUserInfo is request-cached: the layout already fetched (and required) it.
  const admin = (await getUserInfo()) as IAdminUser;
  const hour = hourIn();

  switch (admin.role) {
    case "SUPPORT_ADMIN":
      return <SupportDashboard adminName={admin.name} hour={hour} {...await supportData()} />;
    case "FINANCE_ADMIN":
      return <FinanceDashboard adminName={admin.name} hour={hour} {...await financeData()} />;
    case "CONTENT_ADMIN":
      return <ContentDashboard adminName={admin.name} hour={hour} {...await contentData()} />;
    default:
      return <SuperDashboard adminName={admin.name} hour={hour} {...await superData()} />;
  }
};

export default DashboardPage;
