"use client";

import { Minus, Plus, UserMinus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import DayInput from "@/components/smartly/form/DayInput";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { GroupMember, GroupMemberRole } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { createGroupMemberAction, updateGroupMemberAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import { ROLE_CHIP } from "./GroupSetup";

interface MemberDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  groupName: string;
  members: GroupMember[];
  editing: GroupMember | null;
  // The day a new member starts sharing costs: today, or empty (from the
  // start) while the group has nothing recorded yet.
  defaultJoin: string;
  // Marks the member as left the group (asks first).
  onLeave: (member: GroupMember) => void;
}

const MAX_EDITORS = 2;
const FIELD = "flex h-11.5 items-center gap-2.5 rounded-[14px] border-[1.5px] bg-hover px-3.5 focus-within:border-focus-ring";
const ROLE_SUB: Record<GroupMemberRole, string> = {
  MEMBER: "Counted in the costs, no login",
  VIEWER: "Sees everything, changes nothing",
  ACCOUNTANT: "Adds money entries and keeps group cash",
};

// Add or edit a member (the v16 FamilyMembers popup): the name and mobile,
// when they joined and their shares, who their share covers, and their
// access -- no access, a Viewer, or an Editor who keeps cash (two at most).
// An existing member can be marked as left the group from here.
export function MemberDrawer({ open, onClose, businessId, groupName, members, editing, defaultJoin, onLeave }: MemberDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [household, setHousehold] = useState("");
  const [showWho, setShowWho] = useState(false);
  const [joinedOn, setJoinedOn] = useState("");
  const [shares, setShares] = useState(1);
  const [role, setRole] = useState<GroupMemberRole>("MEMBER");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setPhone(editing?.phone ?? "");
      setHousehold(editing?.household ?? "");
      setShowWho(!!editing?.household);
      setJoinedOn(editing ? (editing.joinedOn?.slice(0, 10) ?? "") : defaultJoin);
      setShares(editing ? Math.max(1, Math.round(Number(editing.shareUnits))) : 1);
      setRole(editing?.role ?? "MEMBER");
      setError("");
    }
  }

  const owner = !!editing?.isOwner;

  // What stops a save, in the board's words.
  function problem(): string {
    const trimmed = name.trim();
    if (!trimmed) return t("Enter the member's name.");
    if (members.some((member) => member.id !== editing?.id && member.name.trim().toLowerCase() === trimmed.toLowerCase())) return t("{name} is already a member.", { name: trimmed });
    const digits = phone.replace(/[\s-]/g, "").replace(/^\+?88/, "");
    if (digits && !/^01[3-9]\d{8}$/.test(digits)) return t("Use an 11-digit mobile number, like 01819-205377.");
    const others = members.filter((member) => member.id !== editing?.id && member.status === "ACTIVE" && member.role === "ACCOUNTANT").length;
    if (role === "ACCOUNTANT" && (editing?.role !== "ACCOUNTANT" || editing.status !== "ACTIVE") && others >= MAX_EDITORS) return t("A group can have up to 2 Editors, you included.");
    return "";
  }

  function save() {
    if (isPending) return;
    const found = problem();
    setError(found);
    if (found) return;
    startTransition(async () => {
      const input = { name: name.trim(), phone: phone.trim() || undefined, joinedOn: joinedOn || null, shareUnits: shares, ...(!owner && { role }), household: household.trim() || null };
      const result = await attempt(() => (editing ? updateGroupMemberAction(businessId, editing.id, input) : createGroupMemberAction(businessId, input)), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? (editing ? t("Failed to update member") : t("Failed to add member")));
        return;
      }
      toast.success(editing ? t("Member updated") : t("Member added"));
      router.refresh();
      onClose();
    });
  }

  const label = "text-[12.5px] font-semibold text-ink-soft";
  const shown = editing ?? { id: "new", name: name || "?", photoUrl: null };
  const roleKeyOf = owner ? "ADMIN" : role;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-[520px] max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border-0 bg-surface p-0 shadow-overlay ring-0">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="flex max-h-[calc(100dvh-32px)] flex-col"
        >
          <div className="relative flex items-center gap-3.5 bg-linear-to-br from-emerald-wash to-mint-50 pt-5.5 pr-5.5 pb-5 pl-6">
            <span className="flex size-13.5 shrink-0 items-center justify-center rounded-[18px] bg-surface shadow-float">
              <MemberAvatar member={shown} members={members} size={44} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <AlertDialogTitle className="text-[19px] font-bold tracking-[-0.01em] text-ink">{editing ? t("Edit member") : t("Add member")}</AlertDialogTitle>
              <AlertDialogDescription className="truncate text-[13px] text-ink-soft">{groupName}</AlertDialogDescription>
            </span>
            <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface/75 text-ink-soft hover:bg-surface">
              <X className="size-4.25" strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pt-5 pb-5.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={label}>{t("Name")}</span>
                <span className={cn(FIELD, error && !name.trim() ? "border-expense" : "border-line")}>
                  <input id="mem-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus className="w-full min-w-0 bg-transparent text-body text-ink outline-none" />
                </span>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={label}>{t("Mobile number")}</span>
                <span className={cn(FIELD, "border-line")}>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" maxLength={14} placeholder="01XXX-XXXXXX" className="w-full min-w-0 bg-transparent text-body text-ink tabular-nums outline-none" />
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className={label}>{t("Member since")}</span>
                <DayInput id="mem-since" size="md" value={joinedOn} onChange={setJoinedOn} aria-label={t("Member since")} />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className={label} title={t("Shares decide each person’s part of “By shares” costs like bazar. Usually the number of people they feed (1 to 20).")}>
                  {t("Shares")}
                </span>
                <span className="flex h-11.5 items-center rounded-[14px] border-[1.5px] border-line bg-hover px-1.25">
                  <button type="button" onClick={() => setShares(Math.max(1, shares - 1))} disabled={shares <= 1} aria-label={t("Fewer shares")} className="flex size-8.5 items-center justify-center rounded-[10px] bg-surface text-ink-2 shadow-[0_1px_2px_rgba(18,32,29,0.10)] disabled:opacity-40">
                    <Minus className="size-3.75" aria-hidden="true" />
                  </button>
                  <span aria-live="polite" className="flex-1 text-center text-[17px] font-bold text-ink tabular-nums">
                    {shares}
                  </span>
                  <button type="button" onClick={() => setShares(Math.min(20, shares + 1))} disabled={shares >= 20} aria-label={t("More shares")} className="flex size-8.5 items-center justify-center rounded-[10px] bg-surface text-ink-2 shadow-[0_1px_2px_rgba(18,32,29,0.10)] disabled:opacity-40">
                    <Plus className="size-3.75" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </div>

            {showWho ? (
              <label className="flex flex-col gap-1.5">
                <span className={label}>{t("Who this covers")}</span>
                <span className={cn(FIELD, "border-line")}>
                  <input value={household} onChange={(event) => setHousehold(event.target.value)} maxLength={60} placeholder={t("e.g. Khaled, wife and daughter")} className="w-full min-w-0 bg-transparent text-body text-ink outline-none" />
                </span>
              </label>
            ) : (
              <button type="button" onClick={() => setShowWho(true)} className="-mt-1.5 flex h-7 items-center gap-1.5 self-start text-[13px] font-semibold text-emerald hover:underline">
                <Plus className="size-3.5" aria-hidden="true" />
                {t("Add who this covers")}
              </button>
            )}

            {owner ? (
              <div className="flex items-center gap-2.5 rounded-[14px] bg-emerald-wash px-3.5 py-3 text-[13px] text-ink-2">
                <span className={cn("rounded-full px-2.25 py-0.5 text-caption font-semibold", ROLE_CHIP.ADMIN.cls)}>{t("Admin")}</span>
                {t("The group’s Admin: that’s you. The role can’t change.")}
              </div>
            ) : (
              <label className="flex flex-col gap-1.5">
                <span className={label}>{t("Role")}</span>
                <span className="relative flex h-13.5 items-center gap-3 rounded-[14px] border-[1.5px] border-line bg-surface pr-3.5 pl-2.5 focus-within:border-focus-ring">
                  <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px] text-caption font-bold", ROLE_CHIP[roleKeyOf].cls)}>{t(ROLE_CHIP[roleKeyOf].label).slice(0, 1)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-[14.5px] font-bold text-ink">{role === "MEMBER" ? t("No access") : t(ROLE_CHIP[roleKeyOf].label)}</span>
                    <span className="truncate text-caption text-ink-muted">{t(ROLE_SUB[role])}</span>
                  </span>
                  <select value={role} onChange={(event) => setRole(event.target.value as GroupMemberRole)} aria-label={t("Role")} className="absolute inset-0 cursor-pointer opacity-0">
                    <option value="MEMBER">{t("No access")}</option>
                    <option value="VIEWER">{t("Viewer")}</option>
                    <option value="ACCOUNTANT">{t("Editor")}</option>
                  </select>
                </span>
              </label>
            )}

            {error && (
              <p role="alert" className="text-[12.5px] font-semibold text-expense">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 px-6 pt-3.5 pb-4.5">
            {editing && !owner && editing.status === "ACTIVE" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLeave(editing);
                }}
                aria-label={t("Mark {name} as left the group", { name: editing.name })}
                title={t("Mark as left the group")}
                className="flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-expense-line bg-surface text-expense hover:bg-expense-soft"
              >
                <UserMinus className="size-4.5" aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={onClose} disabled={isPending} className="h-12 rounded-full border-[1.5px] border-line bg-surface px-5 text-body font-semibold text-ink-2 hover:bg-hover">
              {t("Cancel")}
            </button>
            <button type="submit" disabled={isPending} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-emerald px-5.5 text-[14.5px] font-bold text-on-action hover:bg-emerald-hover disabled:opacity-60">
              {isPending && <Loader />}
              {editing ? t("Save changes") : t("Add member")}
            </button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
