"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import type { GroupMember, GroupMemberRole } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { createGroupMemberAction, updateGroupMemberAction, uploadGroupMemberPhotoAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FOCUS_WITHIN } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";

interface MemberDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  members: GroupMember[];
  editing: GroupMember | null;
  // The day a new member starts sharing costs: today, or empty (from the
  // start) while the group has nothing recorded yet.
  defaultJoin: string;
}

const ROLES: { value: GroupMemberRole; title: string; sub: string }[] = [
  { value: "MEMBER", title: "Member", sub: "Gives money to the accountant" },
  { value: "ACCOUNTANT", title: "Accountant", sub: "Keeps the cash and does the bazar" },
];

const MAX_ACCOUNTANTS = 2;

// Add or edit a member in the v7 popup: the name, a phone for sending the
// statement, and the role -- a member gives money to an accountant, an
// accountant (up to two) keeps the cash. A photo, the day they join (they
// share costs from then on) and who their share covers stay too.
export function MemberDrawer({ open, onClose, businessId, members, editing, defaultJoin }: MemberDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [household, setHousehold] = useState("");
  const [joinedOn, setJoinedOn] = useState("");
  const [role, setRole] = useState<GroupMemberRole>("MEMBER");
  const [error, setError] = useState("");
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
      setJoinedOn(editing ? (editing.joinedOn?.slice(0, 10) ?? "") : defaultJoin);
      setRole(editing?.role ?? "MEMBER");
      setError("");
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

  // What stops a save, in the board's words.
  function problem(): string {
    const trimmed = name.trim();
    if (!trimmed) return t("Enter the member's name.");
    if (members.some((member) => member.id !== editing?.id && member.name.trim().toLowerCase() === trimmed.toLowerCase())) return t("{name} is already a member.", { name: trimmed });
    const others = members.filter((member) => member.id !== editing?.id && member.status === "ACTIVE" && member.role === "ACCOUNTANT").length;
    if (role === "ACCOUNTANT" && (editing?.role !== "ACCOUNTANT" || editing.status !== "ACTIVE") && others >= MAX_ACCOUNTANTS) return t("A family can have up to 2 accountants.");
    return "";
  }

  function save(addAnother: boolean) {
    if (isPending || uploading) return;
    const found = problem();
    setError(found);
    if (found) return;
    startTransition(async () => {
      const input = { name: name.trim(), phone: phone.trim() || undefined, photoUrl: photoUrl || undefined, joinedOn: joinedOn || null, role, household: household.trim() || null };
      const result = await attempt(() => (editing ? updateGroupMemberAction(businessId, editing.id, input) : createGroupMemberAction(businessId, input)), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? (editing ? t("Failed to update member") : t("Failed to add member")));
        return;
      }
      toast.success(editing ? t("Member updated") : t("Member added"));
      router.refresh();
      if (addAnother) {
        // The next person: a fresh name, phone and photo; the same joining day.
        setName("");
        setPhone("");
        setHousehold("");
        setPhotoUrl("");
        setRole("MEMBER");
        document.getElementById("mem-name")?.focus();
      } else {
        onClose();
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  // A backend-served upload, so a plain <img>.
  // eslint-disable-next-line @next/next/no-img-element
  const photo = <img src={photoUrl} alt="" className="size-full object-cover" />;

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={busy}
      width={460}
      title={editing ? t("Edit member") : t("Add member")}
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
      footer={
        <>
          {!editing && (
            <Button type="button" variant="secondary" onClick={() => save(true)} disabled={busy} className="mr-auto max-sm:w-full">
              {t("Save & add another")}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={busy} className="px-4.5">
            {isPending && <Loader />}
            {editing ? t("Save changes") : t("Add member")}
          </Button>
        </>
      }
    >
      <Field htmlFor="mem-name" label={label(t("Name"))}>
        <Input id="mem-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("e.g. Sami Mahmud")} invalid={!!error && !name.trim()} />
      </Field>
      <Field htmlFor="mem-phone" label={label(t("Phone"), true)} hint={t("Used to send the monthly statement on WhatsApp.")}>
        <Input id="mem-phone" size="md" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} placeholder="01XXX-XXXXXX" className="tabular-nums" aria-describedby="mem-phone-hint" />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Role")}</legend>
        {/* Real radios under the cards: arrow keys move between them. */}
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((option) => {
            const on = option.value === role;
            return (
              <label key={option.value} className={cn("relative flex min-h-control-lg cursor-pointer flex-col items-start justify-center gap-px rounded-md border px-3 py-2 text-left", FOCUS_WITHIN, on ? "border-[1.5px] border-emerald bg-mint-50/60" : "border-line bg-surface hover:border-input")}>
                <input type="radio" name="mem-role" checked={on} onChange={() => setRole(option.value)} className="sr-only" />
                <span className={cn("text-small text-ink", on ? "font-bold" : "font-semibold")}>{t(option.title)}</span>
                <span className={cn("text-caption", on ? "text-ink-2" : "text-ink-muted")}>{t(option.sub)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field htmlFor="mem-household" label={label(t("Whose share it covers"), true)}>
        <Input id="mem-household" size="md" value={household} onChange={(event) => setHousehold(event.target.value)} maxLength={120} placeholder={t("e.g. Khaled, wife and daughter")} />
      </Field>

      <Field htmlFor="mem-join" label={label(t("Joins on"), !editing && !defaultJoin)} hint={joinedOn ? t("{name} shares costs from this date only. Earlier days stay as they are.", { name: name.trim() || t("They") }) : t("Shares every cost from the start.")}>
        <DayInput id="mem-join" size="md" value={joinedOn} onChange={setJoinedOn} aria-describedby="mem-join-hint" />
      </Field>

      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} aria-label={t("Add a photo (optional)")} className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-line-strong bg-surface-sunken text-ink-muted hover:border-emerald hover:text-brand-ink disabled:opacity-60">
          {uploading ? <Loader size={20} /> : photoUrl ? photo : <Camera className="size-5" aria-hidden="true" />}
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="hidden" />
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-semibold text-ink">
            {t("Photo")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </span>
          <span className="text-small text-ink-muted">{t("JPG or PNG, up to 2 MB")}</span>
          {photoUrl && (
            <button type="button" onClick={() => setPhotoUrl("")} className="self-start text-small font-semibold text-expense hover:underline">
              {t("Remove photo")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-small font-semibold text-expense">
          {error}
        </p>
      )}
    </GroupDialog>
  );
}
