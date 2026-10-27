import { MANAGE_OWNERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/ManageOwners/manageOwnersTable.config";
import OwnerActivityTimeline from "@/components/modules/Admin/UserManagement/OwnerActivityTimeline";
import OwnerDetailActions from "@/components/modules/Admin/UserManagement/OwnerDetailActions";
import { OwnerDevicesCard } from "@/components/modules/Admin/UserManagement/OwnerDevicesCard";
import { OwnerNotesCard } from "@/components/modules/Admin/UserManagement/OwnerNotesCard";
import OwnerProfileHeader from "@/components/modules/Admin/UserManagement/OwnerProfileHeader";
import { OwnerBillingCard, OwnerReferralsCard, OwnerSupportCard } from "@/components/modules/Admin/UserManagement/OwnerSideCards";
import OwnerSummaryStats from "@/components/modules/Admin/UserManagement/OwnerSummaryStats";
import { OwnerPaymentsCard, OwnerTicketsCard } from "@/components/modules/Admin/UserManagement/OwnerTabPanels";
import { OwnerTabs } from "@/components/modules/Admin/UserManagement/OwnerTabs";
import { ownerTabOf } from "@/components/modules/Admin/UserManagement/peopleDisplay";
import OwnerWorkspacesCard from "@/components/modules/Admin/UserManagement/OwnerWorkspacesCard";
import { USERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/UserManagement/usersTable.config";
import { WORKSPACES_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Workspaces/workspacesTable.config";
import BreadcrumbTitle from "@/components/modules/Dashboard/BreadcrumbTitle";
import BackLink from "@/components/shared/BackLink";
import Callout from "@/components/shared/Callout";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import T from "@/components/shared/T";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { canManage } from "@/lib/authUtils";
import { formatDate } from "@/lib/date";
import { adminPageTitle, getLocale } from "@/lib/i18n/locale";
import { LIST_BACK_PARAM, LIST_PAGE_KEYS, listBackHref, userListFor } from "@/lib/navItem";
import { ownerNotesQuery } from "@/queries/owner.queries";
import { getUserInfo } from "@/services/auth.services";
import { getOwnerById } from "@/services/owner.services";
import { getPayments } from "@/services/payment.services";
import { getPlans } from "@/services/plan.services";

// What each list keeps in its URL besides the page and rows per page, so
// the way back can only restore that list's own filters.
const LIST_QUERY_KEYS = new Map<string, readonly string[]>([
  [userListFor("users").href, USERS_TABLE_BASE_CONFIG.queryKeys],
  [userListFor("owners").href, MANAGE_OWNERS_TABLE_BASE_CONFIG.queryKeys],
  [userListFor("workspaces").href, WORKSPACES_TABLE_BASE_CONFIG.queryKeys],
]);

// The Billing tab's payments: the newest page of them.
const PAYMENTS_SHOWN = 20;

// Next hands a repeated key over as an array; the first one counts.
const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// The tab title comes from the route, never from a read: Next runs this on
// every link prefetch, and a Workspaces page links up to 100 people.
export const generateMetadata = adminPageTitle("User");

// A person's page as the AdminUserDetail board lays it out: who they are
// with every action at the top, then tabs -- Overview (their numbers,
// workspaces, devices and what admins did, beside billing, referrals,
// support and notes), Billing (their payments), Activity (every device and
// admin action), Support (their tickets) and Notes.
const UserDetailPage = async ({ params, searchParams }: PageProps<"/admin/users/[id]">) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tab = ownerTabOf(query.tab);
  // Opened from Owners or Workspaces (?from=), the way back leads there; the
  // list's filters and page ride along in ?back= (see usePersonHref).
  const list = userListFor(single(query.from));
  const backHref = listBackHref(list.href, query[LIST_BACK_PARAM], [...(LIST_QUERY_KEYS.get(list.href) ?? []), ...LIST_PAGE_KEYS]);
  const [owner, plans, admin, locale, payments] = await Promise.all([
    fetchOrNotFound(getOwnerById(id)),
    // Every admin may read the plans; if the request fails the list is
    // empty, and Change plan says so instead of offering nothing.
    getPlans()
      .then((response) => response.data)
      .catch(() => []),
    getUserInfo(),
    getLocale(),
    tab === "billing"
      ? getPayments(`userId=${encodeURIComponent(id)}&limit=${PAYMENTS_SHOWN}`)
          .then((response) => ({ rows: response.data, total: response.meta?.total ?? response.data.length }))
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const role = admin?.role;
  const canSignOut = canManage(role, "ownerStatus");
  const canWriteNotes = canManage(role, "ownerNotes");
  // The Billing tab, keeping ?from= and ?back= as the tabs do.
  const billingQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const text = single(value);
    if (key !== "tab" && text) billingQuery.set(key, text);
  }
  billingQuery.set("tab", "billing");
  const billingHref = `/admin/users/${encodeURIComponent(id)}?${billingQuery}`;
  const ticketsHref = `/admin/support?search=${encodeURIComponent(owner.email)}`;
  const devices = owner.devices ?? [];
  const notes = <OwnerNotesCard userId={owner.userId} canWrite={canWriteNotes} limit={tab === "overview" ? 2 : undefined} />;

  return (
    <div className="flex flex-col gap-4.5">
      <BreadcrumbTitle title={owner.name} />
      <BackLink href={backHref}>
        <T>{list.back}</T>
      </BackLink>
      <OwnerProfileHeader
        owner={owner}
        actions={
          <OwnerDetailActions
            owner={owner}
            plans={plans}
            canChangeStatus={canSignOut}
            canChangePlan={canManage(role, "ownerPlan")}
            canViewAsCustomer={canManage(role, "ownerView")}
            canResetData={canManage(role, "ownerData")}
            canDisableTwoStep={canManage(role, "ownerTwoStep")}
          />
        }
      />
      {owner.status === "SUSPENDED" && owner.suspendedReason && (
        <Callout variant="warning">
          {/* The day and time the way the rest of the page writes them. */}
          <T values={{ suspended: <strong><T>Suspended</T></strong>, date: formatDate(owner.suspendedAt, "d MMM yyyy, h:mm aaa", "—", locale), reason: owner.suspendedReason }}>
            {"{suspended} {date} — {reason}"}
          </T>
        </Callout>
      )}
      {owner.status === "PENDING_DELETION" && owner.deletion?.scheduledFor && (
        <Callout variant="warning">
          <T values={{ date: formatDate(owner.deletion.scheduledFor, "d MMM yyyy", "—", locale) }}>
            {"They asked to delete their account. It goes for good on {date} unless they sign in, or you cancel the deletion."}
          </T>
        </Callout>
      )}
      <OwnerTabs counts={owner.tabCounts} />

      <QueryPrefetch prefetch={(client) => client.prefetchQuery(ownerNotesQuery(owner.userId))}>
        {tab === "overview" && (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-4">
              {owner.stats && <OwnerSummaryStats stats={owner.stats} />}
              {owner.workspaces && <OwnerWorkspacesCard workspaces={owner.workspaces} planName={owner.billing?.planName ?? owner.planName} />}
              {owner.devices && <OwnerDevicesCard userId={owner.userId} name={owner.name} devices={devices} canSignOut={canSignOut} limit={4} />}
              <OwnerActivityTimeline entries={owner.activityLog} limit={6} />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              {owner.billing !== undefined && <OwnerBillingCard billing={owner.billing} billingHref={billingHref} />}
              {owner.stats && <OwnerReferralsCard stats={owner.stats} />}
              {owner.support && <OwnerSupportCard support={owner.support} ticketsHref={ticketsHref} />}
              {notes}
            </div>
          </div>
        )}
        {tab === "billing" && (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <OwnerPaymentsCard payments={payments?.rows ?? null} total={payments?.total ?? 0} allHref={`/admin/payments?search=${encodeURIComponent(owner.email)}`} />
            {owner.billing !== undefined && <OwnerBillingCard billing={owner.billing} />}
          </div>
        )}
        {tab === "activity" && (
          <div className="flex flex-col gap-4">
            {owner.devices && <OwnerDevicesCard userId={owner.userId} name={owner.name} devices={devices} canSignOut={canSignOut} />}
            <OwnerActivityTimeline entries={owner.activityLog} />
          </div>
        )}
        {tab === "support" && <OwnerTicketsCard tickets={owner.support?.latest ?? []} allHref={ticketsHref} />}
        {tab === "notes" && <div className="max-w-180">{notes}</div>}
      </QueryPrefetch>
    </div>
  );
};

export default UserDetailPage;
