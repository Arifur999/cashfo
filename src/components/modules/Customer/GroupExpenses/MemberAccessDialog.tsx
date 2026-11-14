"use client";

import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { GroupAccessLink, GroupAccessLinkKind, GroupMember, GroupMemberRole } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { MEMBER_ROLE_HINTS, MEMBER_ROLE_LABELS, memberAccessRole } from "@/lib/customer/groupAccess";
import { cancelGroupAccessLinkAction, createGroupAccessLinkAction, readGroupAccessLinkAction, updateGroupMemberAction } from "@/lib/customer/groupExpensesActions";
import { formatDay, formatDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";

const CHOICES: { role: GroupMemberRole; label: string; hint: string }[] = [
  { role: "ACCOUNTANT", label: "Editor", hint: "Adds money entries in their own name, keeps group cash" },
  { role: "VIEWER", label: "Viewer", hint: "Sees everything, changes nothing" },
  { role: "MEMBER", label: "No access", hint: "Counted in the costs, no portal" },
];

interface MemberAccessDialogProps {
  member: GroupMember | null;
  onClose: () => void;
  businessId: string;
  // A link was made or read: show it to send.
  onLink: (member: GroupMember, link: GroupAccessLink) => void;
  // Edit the member (to add the phone number a link needs).
  onEditMember: (member: GroupMember) => void;
}

// What a member may do and whether they can log in (the FamilyMembers
// board's access popup): their role -- Editor, Viewer or no access --
// their login or waiting link, and the link actions: make one, copy it
// again, cancel it, a reset link for a forgotten password, or turn access
// off. Only the group's owner opens it.
export function MemberAccessDialog({ member, onClose, businessId, onLink, onEditMember }: MemberAccessDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [role, setRole] = useState<GroupMemberRole>("MEMBER");
  const [prevId, setPrevId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if ((member?.id ?? null) !== prevId) {
    setPrevId(member?.id ?? null);
    if (member) setRole(member.role ?? "MEMBER");
  }
  if (!member) return <PopupDialog open={false} onClose={onClose} title="" />;

  const saved = member.role ?? "MEMBER";
  const access = member.access ?? { login: null, link: null };
  const login = access.login;
  const link = access.link;
  const changed = role !== saved;
  const givesAccess = saved !== "MEMBER";
  const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);
  const noPhone = givesAccess && !login && !member.phone;

  const run = <T,>(work: () => Promise<{ success: boolean; message?: string; data?: T }>, done: (data: T | undefined) => void, failed: string) =>
    startTransition(async () => {
      const result = await attempt(work, offline, stale);
      if (!result.success) {
        toast.error(result.message ?? failed);
        return;
      }
      done(result.data);
      router.refresh();
    });

  const saveRole = (next: GroupMemberRole) =>
    run(
      () => updateGroupMemberAction(businessId, member.id, { role: next }),
      () => toast.success(next === "MEMBER" ? t("Access turned off for {name}", { name: member.name }) : t("{name} is now {role}", { name: member.name, role: t(next === "ACCOUNTANT" ? "an Editor" : "a Viewer") })),
      t("Failed to update member"),
    );
  const makeLink = (kind: GroupAccessLinkKind) =>
    run(
      () => createGroupAccessLinkAction(businessId, member.id, kind),
      (made) => made && onLink(member, made),
      t("Failed to make the link"),
    );
  const copyAgain = () =>
    run(
      () => readGroupAccessLinkAction(businessId, member.id),
      (read) => read && onLink(member, read),
      t("Failed to read the link"),
    );
  const cancelLink = () => run(() => cancelGroupAccessLinkAction(businessId, member.id), () => toast.success(t("Link cancelled")), t("Failed to cancel the link"));

  // Where their access stands, in a few words.
  const status = !givesAccess
    ? t("No access · normal member")
    : login
      ? link?.kind === "RESET"
        ? t("Reset link sent · can still log in")
        : t("Can log in")
      : link
        ? t("Access link sent · waiting")
        : t("No login yet");
  const day = (iso: string) => formatDay(iso.slice(0, 10), "d MMM yyyy", fmt);

  // The footer's main action: save a new role, make the first link, or a reset link.
  const primary = changed
    ? { label: t("Save access"), onClick: () => saveRole(role) }
    : givesAccess && !login && !link && member.phone
      ? { label: t("Make access link"), onClick: () => makeLink("JOIN") }
      : givesAccess && login && !login.ownAccount && link?.kind !== "RESET"
        ? { label: t("Send a reset link"), onClick: () => makeLink("RESET") }
        : null;

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={isPending}
      width={520}
      title={t("Access for {name}", { name: member.name })}
      lead={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
          <KeyRound className="size-4.75" aria-hidden="true" />
        </span>
      }
      footerClassName="justify-start"
      footer={
        <>
          {givesAccess && !changed && (
            <Button variant="ghost" className="text-expense hover:bg-expense-soft" onClick={() => saveRole("MEMBER")} disabled={isPending}>
              {t("Turn off access")}
            </Button>
          )}
          <span className="flex-1" />
          {noPhone && !changed && (
            <Button variant="secondary" onClick={() => onEditMember(member)} disabled={isPending}>
              {t("Add a phone number")}
            </Button>
          )}
          {primary ? (
            <Button onClick={primary.onClick} disabled={isPending}>
              {isPending && <Loader />}
              {primary.label}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Close")}
            </Button>
          )}
        </>
      }
    >
      <div role="radiogroup" aria-label={t("Role")} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {CHOICES.map((choice) => {
          const on = role === choice.role;
          return (
            <button
              key={choice.role}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setRole(choice.role)}
              className={cn("flex flex-col items-start gap-0.5 rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors", on ? "border-emerald bg-emerald-soft" : "border-line bg-surface hover:border-mint-200")}
            >
              <span className={cn("text-[13.5px] font-semibold", on ? "text-emerald" : "text-ink")}>{t(choice.label)}</span>
              <span className="text-[11.5px] leading-[1.35] text-ink-muted">{t(choice.hint)}</span>
            </button>
          );
        })}
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-xl bg-strip px-4 py-3 text-small">
        <dt className="text-ink-muted">{t("Status")}</dt>
        <dd className="font-semibold text-ink">{status}</dd>
        <dt className="text-ink-muted">{t("Role")}</dt>
        <dd className="text-ink-2">
          {t(MEMBER_ROLE_LABELS[memberAccessRole(member)])} · {t(MEMBER_ROLE_HINTS[memberAccessRole(member)])}
        </dd>
        {login && (
          <>
            <dt className="text-ink-muted">{t("Username")}</dt>
            <dd className="text-ink-2">{login.ownAccount ? t("Their own Smartly account") : (login.username ?? "—")}</dd>
            <dt className="text-ink-muted">{t("Last login")}</dt>
            <dd className="text-ink-2">{login.lastLoginAt ? formatDateTime(login.lastLoginAt, "—", fmt) : t("Not yet")}</dd>
          </>
        )}
        <dt className="text-ink-muted">{t("Phone")}</dt>
        <dd className="text-ink-2">{member.phone || "—"}</dd>
      </dl>

      {link && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-warning-line bg-warning-soft/50 px-3.5 py-3">
          <span className="text-small leading-[1.45] text-warning-ink">
            {link.kind === "RESET"
              ? t("Reset link sent {date}. It works once, until {until}; their old password works until then.", { date: day(link.createdAt), until: day(link.expiresAt) })
              : t("Access link sent {date}. It works once, until {until}.", { date: day(link.createdAt), until: day(link.expiresAt) })}
          </span>
          <div className="flex flex-wrap gap-2">
            {link.canCopy && (
              <Button variant="secondary" size="sm" onClick={copyAgain} disabled={isPending}>
                <Copy aria-hidden="true" />
                {link.kind === "RESET" ? t("Copy the reset link again") : t("Copy the link again")}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => makeLink(link.kind)} disabled={isPending}>
              <RefreshCw aria-hidden="true" />
              {link.kind === "RESET" ? t("Make a new reset link") : t("Make a new link")}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelLink} disabled={isPending}>
              {link.kind === "RESET" ? t("Cancel the reset link") : t("Cancel the link")}
            </Button>
          </div>
        </div>
      )}

      {noPhone && <p role="alert" className="text-small text-warning-ink">{t("A mobile number is needed to send the access link.")}</p>}
      {changed && role === "ACCOUNTANT" && <p className="text-caption leading-[1.45] text-ink-muted">{t("Can add, edit and delete their own contributions, expenses, payments and cash handovers in open months, and keep group cash. Can’t change members, roles or settings.")}</p>}
      {changed && role === "MEMBER" && <p className="text-caption leading-[1.45] text-ink-muted">{t("No access: stays in the group and in the cost split, but can’t open the member portal. Any login or link stops working.")}</p>}
    </PopupDialog>
  );
}
