import { isAxiosError } from "axios";
import { ContentDashboard, type ContentDashboardData } from "@/components/modules/Admin/Dashboard/ContentDashboard";
import { FinanceDashboard, type FinanceDashboardData } from "@/components/modules/Admin/Dashboard/FinanceDashboard";
import { SuperDashboard } from "@/components/modules/Admin/Dashboard/SuperDashboard";
import { SupportDashboard } from "@/components/modules/Admin/Dashboard/SupportDashboard";
import type { ApiCheck } from "@/components/modules/Admin/Dashboard/SystemCard";
import { hourIn } from "@/lib/adminDashboard";
import { adminPeriodOf, periodDays } from "@/lib/adminPeriod";
import type { Params } from "@/lib/customer/period";
import { getAppToday } from "@/lib/date";
import { adminPageTitle } from "@/lib/i18n/locale";
import { getAnnouncements } from "@/services/announcement.services";
import { getUserInfo } from "@/services/auth.services";
import { getCategories } from "@/services/category.services";
import { getDashboardOverview, getDashboardSummary } from "@/services/dashboard.services";
import { getLegalDocuments } from "@/services/legalDocument.services";
import { getPayments } from "@/services/payment.services";
import { getPlanAnalytics, getPlans } from "@/services/plan.services";
import { getChurn, getRevenueOverview, getRevenueSummary } from "@/services/revenue.services";
import { getHealth } from "@/services/system.services";
import { getTranslations } from "@/services/translation.services";
import type { IAdminUser } from "@/types/auth.types";

export const generateMetadata = adminPageTitle("Dashboard");

// A call that fails here is an outage or a timeout. It comes back as null,
// and its card says it couldn't load: it never fails the whole page, and
// never reads as "nothing here" or "all clear".
async function maybe<T>(call: () => Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await call()).data;
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
async function apiCheck(): Promise<ApiCheck> {
  const started = Date.now();
  try {
    const { data } = await getHealth();
    return data.status === "ok" ? { healthy: true, latencyMs: data.latencyMs ?? Date.now() - started } : { healthy: false, latencyMs: null };
  } catch (error) {
    const answered = isAxiosError(error) && error.response?.status === 503 && (error.response.data as { status?: string } | undefined)?.status === "error";
    return { healthy: answered ? false : null, latencyMs: null };
  }
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

// The server's clock as the page read its data, so the waits the server
// prints and the ones the browser hydrates are the same text.
async function supportData() {
  const summary = await maybe(() => getDashboardSummary());
  return { support: summary?.support ?? null, now: Date.now() };
}

// The period the address asks for (this month by default), read on the
// server so the figures and the picker agree.
async function superData(params: Params) {
  const today = getAppToday();
  const period = adminPeriodOf(params, today);
  const { from, to } = periodDays(period);
  const [{ data: overview }, api] = await Promise.all([getDashboardOverview(from, to), apiCheck()]);
  return { overview, period, today, api, now: Date.now() };
}

// Each role gets the dashboard cut to its work: the super admin sees it all
// (AdminDashboard), a support admin their tickets (AdminDashboardSupport);
// the finance and content admins keep their own overviews.
const DashboardPage = async ({ searchParams }: PageProps<"/admin/dashboard">) => {
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
      return <SuperDashboard adminName={admin.name} hour={hour} {...await superData(await searchParams)} />;
  }
};

export default DashboardPage;
