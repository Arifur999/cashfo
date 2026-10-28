"use client";

import { useQuery } from "@tanstack/react-query";
import { AtSign, Check, Info, X } from "lucide-react";
import { useState } from "react";
import { resendInviteAction, revokeInviteAction } from "@/app/(dashboardLayout)/admin/security/(sections)/admins/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import ListEmpty from "@/components/smartly/list/ListEmpty";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { ADMIN_ROLE_CHIP, ADMIN_ROLE_SHORT_LABELS } from "@/lib/adminRoles";
import { formatDate, formatDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { adminAccountsQuery, adminInvitesQuery } from "@/queries/security.queries";
import { platformSettingsQuery } from "@/queries/settings.queries";
import type { IAdminAccount, IAdminInvite } from "@/types/adminAccount.types";
import type { AdminRole } from "@/types/auth.types";
import AdminAvatar from "../AdminAvatar";
import AdminDialogs, { type AdminDialog } from "./AdminDialogs";
import AdminRowActions, { InviteRowActions } from "./AdminRowActions";
import { teamRows, twoStepCoverage, type TeamRow } from "./teamRows";
import TwoStepBanner from "./TwoStepBanner";

// The board's grid: who, role, two-step, last sign-in, status, actions.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_120px_110px_150px_110px_150px] md:gap-x-3";
const INSET = "md:px-4.5";

const RoleChip = ({ role }: { role: AdminRole }) => (
  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-semibold whitespace-nowrap", ADMIN_ROLE_CHIP[role])}>
    <T>{ADMIN_ROLE_SHORT_LABELS[role]}</T>
  </span>
);

const STATUS: Record<"ACTIVE" | "SUSPENDED" | "INVITED" | "EXPIRED", { label: string; tone: "mint" | "expense" | "neutral" }> = {
  ACTIVE: { label: "Active", tone: "mint" },
  SUSPENDED: { label: "Suspended", tone: "expense" },
  INVITED: { label: "Invited", tone: "neutral" },
  EXPIRED: { label: "Invite ended", tone: "neutral" },
};

const StatusChip = ({ status }: { status: keyof typeof STATUS }) => (
  <Chip tone={STATUS[status].tone}>
    <T>{STATUS[status].label}</T>
  </Chip>
);

// "On" with a tick in emerald, "Off" with a cross in amber, "—" for an invite.
const TwoStep = ({ on }: { on: boolean | undefined }) =>
  on === undefined ? (
    <span className="font-semibold text-ink-faint">—</span>
  ) : (
    <span className={cn("flex items-center gap-1.5 font-semibold", on ? "text-emerald" : "text-warning")}>
      {on ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" /> : <X className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
      <T>{on ? "On" : "Off"}</T>
    </span>
  );

const AdminLine = ({ admin, isSelf, onOpen }: { admin: IAdminAccount; isSelf: boolean; onOpen: (dialog: AdminDialog, admin: IAdminAccount) => void }) => {
  const { locale } = useLocale();
  const suspended = admin.status === "SUSPENDED";
  return (
    <ListRow columns={COLUMNS} className={cn(INSET, "min-h-15 text-[13.5px] md:py-2")}>
      <ListCell className="flex min-w-0 items-center gap-2.5">
        <AdminAvatar name={admin.name} role={admin.role} muted={suspended} />
        <span className="flex min-w-0 flex-col gap-px">
          {/* "(you)" sits after the name, so a long name truncates without cutting it off. */}
          <span className="flex min-w-0 items-baseline gap-1">
            <span className={cn("min-w-0 truncate font-semibold", suspended ? "text-ink-muted" : "text-ink")}>{admin.name}</span>
            {isSelf && (
              <span className="shrink-0 font-semibold text-ink">
                <T>(you)</T>
              </span>
            )}
          </span>
          <span className="truncate text-[12.5px] text-ink-muted">{admin.email}</span>
          {/* Phones: the role and status under the name. */}
          <span className="mt-1 flex flex-wrap gap-1.5 md:hidden">
            <RoleChip role={admin.role} />
            <StatusChip status={admin.status} />
          </span>
        </span>
      </ListCell>
      <ListCell className="hidden md:block">
        <RoleChip role={admin.role} />
      </ListCell>
      <ListCell className="hidden md:block">
        <TwoStep on={admin.twoFactorEnabled ?? false} />
      </ListCell>
      <ListCell className="hidden text-small whitespace-nowrap text-ink-2 md:block" title={admin.lastLoginAt ? formatDateTime(admin.lastLoginAt, "—", locale) : undefined}>
        {admin.lastLoginAt ? <RelativeTime value={admin.lastLoginAt} as="day" /> : <T>Never</T>}
      </ListCell>
      <ListCell className="hidden md:block">
        <StatusChip status={admin.status} />
      </ListCell>
      <ListCell className="flex items-center justify-end gap-1.5">
        <AdminRowActions admin={admin} isSelf={isSelf} onOpen={onOpen} />
      </ListCell>
    </ListRow>
  );
};

const InviteLine = ({ invite, isResending, onResend, onCancel }: { invite: IAdminInvite; isResending: boolean; onResend: (invite: IAdminInvite) => void; onCancel: (invite: IAdminInvite) => void }) => {
  const { locale } = useLocale();
  const day = (value: string) => formatDate(value, "d MMM", "—", locale);
  const status = invite.status === "EXPIRED" ? "EXPIRED" : "INVITED";
  return (
    <ListRow columns={COLUMNS} className={cn(INSET, "min-h-15 bg-strip text-[13.5px] md:py-2")}>
      <ListCell className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className="flex size-8.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-input bg-surface text-ink-faint">
          <AtSign className="size-3.5" />
        </span>
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-semibold text-ink">{invite.name ? `${invite.name} · ${invite.email}` : invite.email}</span>
          <span className="truncate text-[12.5px] text-ink-muted">
            <T values={{ sent: day(invite.lastSentAt), ends: day(invite.expiresAt) }}>
              {invite.status === "EXPIRED" ? "Invite sent {sent} · ended {ends}" : "Invite sent {sent} · ends {ends}"}
            </T>
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5 md:hidden">
            <RoleChip role={invite.role} />
            <StatusChip status={status} />
          </span>
        </span>
      </ListCell>
      <ListCell className="hidden md:block">
        <RoleChip role={invite.role} />
      </ListCell>
      <ListCell className="hidden md:block">
        <TwoStep on={undefined} />
      </ListCell>
      <ListCell className="hidden text-small text-ink-2 md:block">
        <T>Not yet</T>
      </ListCell>
      <ListCell className="hidden md:block">
        <StatusChip status={status} />
      </ListCell>
      <ListCell className="flex items-center justify-end gap-1.5">
        <InviteRowActions invite={invite} isResending={isResending} onResend={onResend} onCancel={onCancel} />
      </ListCell>
    </ListRow>
  );
};

// Security > Admin team as the board draws it: the two-step warning, then
// everyone on the team and the invites still open, on one card. The whole
// team fits there, so there is nothing to search or page.
const AdminsTable = ({ currentAdminId }: { currentAdminId: string | null }) => {
  const { translate } = useLocale();
  const admins = useQuery(adminAccountsQuery());
  const invites = useQuery(adminInvitesQuery());
  const settings = useQuery(platformSettingsQuery());
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IAdminAccount, AdminDialog>();
  const [cancelling, setCancelling] = useState<IAdminInvite | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const resend = useActionMutation({
    action: resendInviteAction,
    successMessage: "Invite sent again",
    invalidateKeys: [queryKeys.admins.all],
    refreshRoute: false,
  });
  const revoke = useActionMutation({
    action: revokeInviteAction,
    successMessage: "Invite cancelled",
    invalidateKeys: [queryKeys.admins.all],
    refreshRoute: false,
  });

  // The viewer is an admin, so an empty team can only mean the read failed.
  if (admins.isError && !admins.data) {
    return <ErrorState title={translate("Couldn't load the admin team")} onRetry={() => void admins.refetch()} className="shadow-card" />;
  }

  const team = admins.data?.data;
  // An invite list that failed leaves the team on screen without them.
  const rows: TeamRow[] = team ? teamRows(team, invites.data?.data ?? [], currentAdminId) : [];
  const coverage = team ? twoStepCoverage(team) : null;

  return (
    <div className="flex flex-col gap-4.5">
      {coverage && <TwoStepBanner using={coverage.using} total={coverage.total} required={settings.data?.data.adminTwoStepRequired} />}
      <ListCard
        label={translate("Admins")}
        busy={admins.isFetching}
        footer={
          <div className="flex items-center gap-2 border-t border-divider px-4 py-3 text-[12.5px] text-ink-muted md:px-4.5">
            <Info className="size-3.75 shrink-0 text-ink-faint" aria-hidden="true" />
            <span>
              <T>{"The ⋯ menu has Reset password, Turn off two-step and Suspend. You can't suspend yourself or the last super admin."}</T>
            </span>
          </div>
        }
      >
        <ListHead columns={COLUMNS} className={cn(INSET, "h-auto py-2.5")}>
          <ListHeadCell>
            <T>Admin</T>
          </ListHeadCell>
          <ListHeadCell>
            <T>Role</T>
          </ListHeadCell>
          <ListHeadCell>
            <T>Two-step</T>
          </ListHeadCell>
          <ListHeadCell>
            <T>Last sign-in</T>
          </ListHeadCell>
          <ListHeadCell>
            <T>Status</T>
          </ListHeadCell>
          <ListHeadCell align="end">
            <T>Actions</T>
          </ListHeadCell>
        </ListHead>
        {!team ? (
          <div role="row">
            <div role="cell">
              <SkeletonRows rows={5} />
            </div>
          </div>
        ) : rows.length === 0 ? (
          <ListEmpty title={<T>No admins yet.</T>} />
        ) : (
          rows.map((row) =>
            row.kind === "admin" ? (
              <AdminLine key={row.id} admin={row.admin} isSelf={row.admin.id === currentAdminId} onOpen={openDialog} />
            ) : (
              <InviteLine
                key={row.id}
                invite={row.invite}
                isResending={resendingId === row.invite.id}
                onResend={async (invite) => {
                  setResendingId(invite.id);
                  await resend.run(invite.id);
                  setResendingId(null);
                }}
                onCancel={setCancelling}
              />
            ),
          )
        )}
      </ListCard>
      <AdminDialogs admin={activeRow} activeDialog={activeDialog} currentAdminId={currentAdminId} onClose={closeDialog} />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel invite"
        description={translate("The link sent to {email} stops working. You can invite them again later.", { email: cancelling?.email ?? "" })}
        variant="destructive"
        confirmLabel="Cancel invite"
        pendingLabel="Cancelling..."
        isPending={revoke.isPending}
        onConfirm={async () => {
          if (cancelling && (await revoke.run(cancelling.id))) setCancelling(null);
        }}
      />
    </div>
  );
};

export default AdminsTable;
