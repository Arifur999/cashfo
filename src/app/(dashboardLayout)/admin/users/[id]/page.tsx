import { MANAGE_OWNERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/ManageOwners/manageOwnersTable.config";
import OwnerActivityTimeline from "@/components/modules/Admin/UserManagement/OwnerActivityTimeline";
import OwnerDetailActions from "@/components/modules/Admin/UserManagement/OwnerDetailActions";
import OwnerProfileHeader from "@/components/modules/Admin/UserManagement/OwnerProfileHeader";
import OwnerSummaryStats from "@/components/modules/Admin/UserManagement/OwnerSummaryStats";
import { USERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/UserManagement/usersTable.config";
import { WORKSPACES_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Workspaces/workspacesTable.config";
import BreadcrumbTitle from "@/components/modules/Dashboard/BreadcrumbTitle";
import BackLink from "@/components/shared/BackLink";
import Callout from "@/components/shared/Callout";
import T from "@/components/shared/T";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { canManage } from "@/lib/authUtils";
import { formatDate } from "@/lib/date";
import { adminPageTitle } from "@/lib/i18n/locale";
import { LIST_BACK_PARAM, LIST_PAGE_KEYS, listBackHref, userListFor } from "@/lib/navItem";
import { getUserInfo } from "@/services/auth.services";
import { getOwnerById } from "@/services/owner.services";
import { getPlans } from "@/services/plan.services";

// What each list keeps in its URL besides the page and rows per page, so
// the way back can only restore that list's own filters.
const LIST_QUERY_KEYS = new Map<string, readonly string[]>([
  [userListFor("users").href, USERS_TABLE_BASE_CONFIG.queryKeys],
  [userListFor("owners").href, MANAGE_OWNERS_TABLE_BASE_CONFIG.queryKeys],
  [userListFor("workspaces").href, WORKSPACES_TABLE_BASE_CONFIG.queryKeys],
]);

// Next hands a repeated key over as an array; the first one counts.
const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// The tab title comes from the route, never from a read: Next runs this on
// every link prefetch, and a Workspaces page links up to 100 people.
export const generateMetadata = adminPageTitle("User");

const UserDetailPage = async ({ params, searchParams }: PageProps<"/admin/users/[id]">) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  // Opened from Owners or Workspaces (?from=), the way back leads there; the
  // list's filters and page ride along in ?back= (see usePersonHref).
  const list = userListFor(single(query.from));
  const backHref = listBackHref(list.href, query[LIST_BACK_PARAM], [...(LIST_QUERY_KEYS.get(list.href) ?? []), ...LIST_PAGE_KEYS]);
  const [owner, plans, admin] = await Promise.all([
    fetchOrNotFound(getOwnerById(id)),
    // Every admin may read the plans; if the request fails the list is
    // empty, and Change plan says so instead of offering nothing.
    getPlans()
      .then((response) => response.data)
      .catch(() => []),
    getUserInfo(),
  ]);

  return (
    <div className="flex flex-col gap-4">
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
            canChangeStatus={canManage(admin?.role, "ownerStatus")}
            canChangePlan={canManage(admin?.role, "ownerPlan")}
            canViewAsCustomer={canManage(admin?.role, "ownerView")}
            canResetData={canManage(admin?.role, "ownerData")}
          />
        }
      />
      <OwnerSummaryStats owner={owner} />
      {owner.status === "SUSPENDED" && owner.suspendedReason && (
        <Callout variant="warning">
          {/* The day and time the way the rest of the page writes them. */}
          <T values={{ suspended: <strong><T>Suspended</T></strong>, date: formatDate(owner.suspendedAt, "d MMM yyyy, h:mm aaa"), reason: owner.suspendedReason }}>
            {"{suspended} {date} — {reason}"}
          </T>
        </Callout>
      )}
      <OwnerActivityTimeline entries={owner.activityLog} />
    </div>
  );
};

export default UserDetailPage;
