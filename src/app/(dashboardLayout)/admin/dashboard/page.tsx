import { ContentDashboard, type ContentDashboardData } from "@/components/modules/Admin/Dashboard/ContentDashboard";
import { FinanceDashboard, type FinanceDashboardData } from "@/components/modules/Admin/Dashboard/FinanceDashboard";
import { SuperDashboard, type SuperDashboardData } from "@/components/modules/Admin/Dashboard/SuperDashboard";
import { SupportDashboard, type SupportDashboardData } from "@/components/modules/Admin/Dashboard/SupportDashboard";
import { hourIn } from "@/lib/adminDashboard";
import { getAnnouncements } from "@/services/announcement.services";
import { getUserInfo } from "@/services/auth.services";
import { getCategories } from "@/services/category.services";
import { getDashboardSummary } from "@/services/dashboard.services";
import { getFeatureRequests } from "@/services/featureRequest.services";
import { getLegalDocuments } from "@/services/legalDocument.services";
import { getPayments } from "@/services/payment.services";
import { getPlanAnalytics, getPlans } from "@/services/plan.services";
import { getChurn, getRevenueSummary } from "@/services/revenue.services";
import { getBackupStatusSummary, getErrorLogs, getHealth } from "@/services/system.services";
import { getTickets, getTicketStats } from "@/services/ticket.services";
import { getTranslations } from "@/services/translation.services";
import type { IAdminUser } from "@/types/auth.types";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Dashboard");

// A section a role can't read (403) or a call that fails shows as "not
// available" rather than failing the whole page.
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

async function superData(): Promise<SuperDashboardData> {
  const [{ data: summary }, tickets, failedPayments, revenue, plans, planList, health, backup, unresolvedErrors] = await Promise.all([
    getDashboardSummary(),
    maybe(getTicketStats),
    countOf(() => getPayments("limit=1", "failed")),
    maybe(getRevenueSummary),
    maybe(getPlanAnalytics),
    maybe(getPlans),
    maybe(getHealth),
    maybe(getBackupStatusSummary),
    countOf(() => getErrorLogs("resolved=false&limit=1")),
  ]);
  return { summary, tickets, failedPayments, revenue, plans, planList, system: { healthy: health ? health.status === "ok" : health === null ? null : false, backup, unresolvedErrors } };
}

async function supportData(): Promise<SupportDashboardData> {
  const [stats, queue, requests] = await Promise.all([maybe(getTicketStats), maybe(() => getTickets("status=OPEN&limit=6")), maybe(getFeatureRequests)]);
  // Oldest first: the one that has waited longest needs the reply first.
  return { stats, queue: [...(queue ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), requests: requests ?? [] };
}

async function financeData(): Promise<FinanceDashboardData> {
  const [revenue, churn, plans, planList, failedList] = await Promise.all([maybe(getRevenueSummary), maybe(getChurn), maybe(getPlanAnalytics), maybe(getPlans), (async () => {
    try {
      return await getPayments("limit=5", "failed");
    } catch {
      return null;
    }
  })()]);
  return { revenue, churn, plans, planList, failed: failedList?.data ?? [], failedTotal: failedList?.meta?.total ?? 0 };
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
