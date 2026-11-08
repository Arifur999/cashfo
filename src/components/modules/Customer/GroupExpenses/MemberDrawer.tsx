"use client";

import { Camera, KeyRound, Minus, Plus, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { GroupCostSplit, GroupMember, GroupMemberRole } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { MEMBER_ROLE_LABELS, memberAccessRole } from "@/lib/customer/groupAccess";
import { createGroupAccessLinkAction, createGroupMemberAction, setGroupCostSplitAction, updateGroupMemberAction, uploadGroupMemberPhotoAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { type AccessLinkShown, AccessLinkDialog } from "./AccessLinkDialog";
import { GroupDialog } from "./GroupDialog";
import { percentsOf } from "./NewGroupDialog";

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
  costSplit: GroupCostSplit;
  // "Remove from the group" for a member being edited (asks first).
  onRemove?: (member: GroupMember) => void;
}

const MAX_ACCOUNTANTS = 2;
const MAX_SHARES = 20;
const ROLE_SHORT: Record<GroupMemberRole, string> = {
  MEMBER: "Normal member · no portal, no link",
  ACCOUNTANT: "Editor · adds entries in their own name",
  VIEWER: "Viewer · sees everything, changes nothing",
};
// An 11-digit Bangladeshi mobile number from what was typed: "" when blank,
// null when it isn't one.
const mobileOf = (raw: string): string | null => {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+?88/, "");
  if (!digits) return "";
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
};
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? "")
    .join("");

// Add or edit a member (the v16 FamilyMembers board's popup): a coloured
// head with their initials, the group and their role; name and mobile
// number, member since and shares, who the share covers, and their access
// (Editor, Viewer or none -- the owner stays Admin). Shares become the cost
// split when they change. A new member given access gets their access link
// at once, to send. The photo stays from the v7 popup.
export function MemberDrawer({ open, onClose, businessId, groupName, members, editing, defaultJoin, costSplit, onRemove }: MemberDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [household, setHousehold] = useState("");
  const [showWho, setShowWho] = useState(false);
  const [joinedOn, setJoinedOn] = useState("");
  const [shares, setShares] = useState(1);
  const [role, setRole] = useState<GroupMemberRole>("MEMBER");
  const [tried, setTried] = useState(false);
  const [linkShown, setLinkShown] = useState<AccessLinkShown | null>(null);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setPhotoUrl(editing?.photoUrl ?? "");
      setName(editing?.name ?? "");
      setPhone(editing?.phone ?? "");
      setHousehold(editing?.household ?? "");
      setShowWho(!!editing?.household);
      setJoinedOn(editing ? (editing.joinedOn?.slice(0, 10) ?? "") : defaultJoin);
      setShares(Math.min(MAX_SHARES, Math.max(1, Math.round(Number(editing?.shareUnits ?? 1)))));
      setRole(editing?.role ?? "MEMBER");
      setTried(false);
    }
  }

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadGroupMemberPhotoAction(businessId, formData);
      if (result.success && result.data) setPhotoUrl(result.data.url);
      else toast.error(result.message ?? t("Failed to upload photo"));
    } catch {
      toast.error(t("Failed to upload photo"));
    } finally {
      setUploading(false);
    }
  }

  // A photo still uploading lands in this form when it arrives, so the
  // dialog stays open until then, as it does while saving.
  const busy = isPending || uploading;
  const owner = !!editing?.isOwner;
  const trimmed = name.trim();
  const mobile = mobileOf(phone);
  const others = members.filter((member) => member.id !== editing?.id && member.status === "ACTIVE" && member.role === "ACCOUNTANT").length;
  const wantsLink = !owner && role !== "MEMBER" && !editing?.userId;
  const errors = {
    name: !trimmed
      ? t("Enter the member's name.")
      : members.some((member) => member.id !== editing?.id && member.name.trim().toLowerCase() === trimmed.toLowerCase())
        ? t("{name} is already a member.", { name: trimmed })
        : null,
    phone:
      mobile === null
        ? t("Use an 11-digit mobile number, like 01819-205377.")
        : !mobile && wantsLink
          ? t("A mobile number is needed to send the access link.")
          : mobile && members.some((member) => member.id !== editing?.id && member.status === "ACTIVE" && mobileOf(member.phone ?? "") === mobile)
            ? t("This number is already in the group.")
            : null,
    role: role === "ACCOUNTANT" && (editing?.role !== "ACCOUNTANT" || editing.status !== "ACTIVE") && others >= MAX_ACCOUNTANTS ? t("Up to 2 Editors keep the group cash.") : null,
  };
  const show = (error: string | null) => (tried ? error : null);

  // Shares decide "by shares" costs through the cost split: when they
  // change, the split follows them (equal when everyone has the same).
  async function followShares(memberId: string) {
    const active = members.filter((member) => member.status === "ACTIVE" && member.id !== memberId);
    const list = [...active.map((member) => ({ id: member.id, units: Number(member.shareUnits || 1) })), { id: memberId, units: shares }];
    const equal = list.every((entry) => entry.units === list[0].units);
    if (equal && costSplit === "EQUAL") return;
    const percents = percentsOf(list.map((entry) => entry.units));
    await attempt(
      () => setGroupCostSplitAction(businessId, equal ? { mode: "EQUAL" } : { mode: "CUSTOM", members: list.map((entry, index) => ({ groupMemberId: entry.id, percent: percents[index] })) }),
      t(OFFLINE_MESSAGE),
      t(STALE_MESSAGE),
    );
  }

  function save(addAnother: boolean) {
    setTried(true);
    if (busy || Object.values(errors).some(Boolean)) return;
    startTransition(async () => {
      const input = { name: trimmed, phone: mobile || undefined, photoUrl: photoUrl || undefined, joinedOn: joinedOn || null, household: household.trim() || null, shareUnits: shares, ...(!owner && { role }) };
      const result = await attempt(() => (editing ? updateGroupMemberAction(businessId, editing.id, input) : createGroupMemberAction(businessId, input)), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success || !result.data) {
        toast.error(result.message ?? (editing ? t("Failed to update member") : t("Failed to add member")));
        return;
      }
      const saved = result.data;
      const sharesChanged = !editing || Number(editing.shareUnits || 1) !== shares;
      if (sharesChanged && saved.status === "ACTIVE") await followShares(saved.id);
      // A new member given access gets their link at once.
      if (!editing && wantsLink) {
        const link = await attempt(() => createGroupAccessLinkAction(businessId, saved.id, "JOIN"), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
        router.refresh();
        if (link.success && link.data) {
          setLinkShown({ link: link.data, name: saved.name, phone: saved.phone, roleLabel: t(MEMBER_ROLE_LABELS[memberAccessRole(saved)]), groupName });
          return;
        }
        toast.warning(t("Member added, but the link wasn't made. Make it from the key in Members."));
        onClose();
        return;
      }
      toast.success(editing ? t("Member updated") : t("Member added"));
      router.refresh();
      if (addAnother) {
        // The next person: a fresh name, phone, photo and share; the same joining day.
        setName("");
        setPhone("");
        setHousehold("");
        setShowWho(false);
        setPhotoUrl("");
        setShares(1);
        setRole("MEMBER");
        setTried(false);
        document.getElementById("mem-name")?.focus();
      } else {
        onClose();
      }
    });
  }

  // A backend-served upload, so a plain <img>.
  // eslint-disable-next-line @next/next/no-img-element
  const photo = <img src={photoUrl} alt="" className="size-full object-cover" />;
  const rolePill = owner ? t("Admin") : t(role === "ACCOUNTANT" ? "Editor" : role === "VIEWER" ? "Viewer" : "No access");
  const initials = initialsOf(name);

  if (linkShown) return <AccessLinkDialog shown={linkShown} onClose={() => (setLinkShown(null), onClose())} />;

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={busy}
      width={520}
      hero
      lead={
        <span aria-hidden="true" className="flex size-13.5 shrink-0 items-center justify-center rounded-[18px] bg-surface text-[19px] font-bold tracking-[0.02em] text-emerald shadow-card">
          {initials || <UserPlus className="size-6" />}
        </span>
      }
      title={editing ? t("Edit member") : t("Add member")}
      sub={
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
          <span className="truncate">{groupName}</span>
          <span aria-hidden="true">·</span>
          <span className="rounded-full bg-surface px-2.25 py-0.5 text-[11.5px] font-bold whitespace-nowrap text-emerald">{rolePill}</span>
        </span>
      }
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
      footer={
        <>
          {editing && !owner && onRemove && (
            <Button type="button" variant="ghost" onClick={() => onRemove(editing)} disabled={busy} aria-label={t("Remove from the group")} title={t("Remove from the group")} className="mr-auto px-3 text-expense hover:bg-expense-soft">
              <UserMinus aria-hidden="true" />
            </Button>
          )}
          {!editing && (
            <Button type="button" variant="secondary" onClick={() => save(true)} disabled={busy || wantsLink} className="mr-auto max-sm:w-full">
              {t("Save & add another")}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={busy} className="px-5">
            {isPending && <Loader />}
            {editing ? t("Save changes") : wantsLink ? t("Add and make link") : t("Add member")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field htmlFor="mem-name" label={t("Name")} error={show(errors.name)}>
          <Input id="mem-name" size="lg" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={40} placeholder={t("e.g. Sami Mahmud")} invalid={!!show(errors.name)} />
        </Field>
        <Field htmlFor="mem-phone" label={t("Mobile number")} error={show(errors.phone)}>
          <Input id="mem-phone" size="lg" type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={16} placeholder="01XXX-XXXXXX" invalid={!!show(errors.phone)} className="tabular-nums" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field htmlFor="mem-join" label={t("Member since")} hint={joinedOn ? undefined : t("Shares every cost from the start.")}>
          <DayInput id="mem-join" size="lg" value={joinedOn} onChange={setJoinedOn} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-body font-medium text-ink" title={t("Shares decide each person’s part of “By shares” costs like bazar. Usually the number of people they feed (1 to 20).")}>
            {t("Shares")}
          </span>
          <span className="flex h-12 items-center justify-between rounded-field border border-input bg-surface px-1.5">
            <button type="button" onClick={() => setShares(Math.max(1, shares - 1))} disabled={shares <= 1} aria-label={t("Fewer shares")} className="flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-sunken disabled:opacity-40">
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span aria-live="polite" className="text-[16px] font-bold text-ink tabular-nums">
              {shares}
            </span>
            <button type="button" onClick={() => setShares(Math.min(MAX_SHARES, shares + 1))} disabled={shares >= MAX_SHARES} aria-label={t("More shares")} className="flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-sunken disabled:opacity-40">
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>

      {showWho ? (
        <Field htmlFor="mem-household" label={t("Who this covers")}>
          <Input id="mem-household" size="lg" value={household} onChange={(event) => setHousehold(event.target.value)} maxLength={60} placeholder={t("e.g. Sami, wife and son")} />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowWho(true)} className="-mt-1 self-start text-small font-semibold text-emerald hover:underline">
          + {t("Add who this share covers")}
        </button>
      )}

      {owner ? (
        <p className="flex items-center gap-2 rounded-xl bg-strip px-3.5 py-3 text-small text-ink-2">
          <Chip tone="mint" size="sm">
            {t("Admin")}
          </Chip>
          {t("The group owner. This role can’t be changed.")}
        </p>
      ) : (
        <Field htmlFor="mem-role" label={t("Access")} hint={t(ROLE_SHORT[role])} error={show(errors.role)}>
          <NativeSelect id="mem-role" size="lg" value={role} onChange={(event) => setRole(event.target.value as GroupMemberRole)} frameClassName="w-full" invalid={!!show(errors.role)}>
            <option value="MEMBER">{t("No access")}</option>
            <option value="ACCOUNTANT">{t("Editor")}</option>
            <option value="VIEWER">{t("Viewer")}</option>
          </NativeSelect>
        </Field>
      )}

      {wantsLink && !editing && (
        <p role="note" className="flex gap-3 rounded-xl border border-emerald-line bg-mint-50/60 px-3.5 py-3">
          <KeyRound className="mt-0.5 size-4.5 shrink-0 text-emerald" aria-hidden="true" />
          <span className="flex flex-col gap-0.5">
            <span className="text-small font-semibold text-ink">{t("An access link will be made")}</span>
            <span className="text-caption text-ink-muted">{t("Send it by SMS or WhatsApp · they set their own username and password")}</span>
          </span>
        </p>
      )}

      <div className="flex items-center gap-3.5">
        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} aria-label={t("Add a photo (optional)")} className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-line-strong bg-surface-sunken text-ink-muted hover:border-emerald hover:text-brand-ink disabled:opacity-60">
          {uploading ? <Loader size={18} /> : photoUrl ? photo : <Camera className="size-4.5" aria-hidden="true" />}
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="hidden" />
        <span className="flex flex-col gap-0.5 text-small">
          <span className="font-semibold text-ink">
            {t("Photo")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </span>
          {photoUrl ? (
            <button type="button" onClick={() => setPhotoUrl("")} className="self-start font-semibold text-expense hover:underline">
              {t("Remove photo")}
            </button>
          ) : (
            <span className="text-ink-muted">{t("JPG or PNG, up to 2 MB")}</span>
          )}
        </span>
      </div>
    </GroupDialog>
  );
}
