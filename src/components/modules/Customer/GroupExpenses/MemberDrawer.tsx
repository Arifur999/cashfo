"use client";

import { Camera, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import type { GroupMember } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { createGroupMemberAction, updateGroupMemberAction, updateGroupSettingsAction, uploadGroupMemberPhotoAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FOCUS_WITHIN } from "./GroupBits";
import { ShareStepper } from "./ShareStepper";

interface MemberDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: GroupMember | null;
  // Who keeps the cash now (the manager).
  cashHolderId: string | null;
  // The day a new member starts sharing costs: today, or empty (from the
  // start) while the group has nothing recorded yet.
  defaultJoin: string;
}

const ROLES = [
  { value: false, title: "Member", sub: "Shares the costs" },
  { value: true, title: "Manager", sub: "Also holds the cash" },
];

// Add or edit a member in the design's drawer: a photo, the name, a phone
// for sending the statement, the day they join (they share costs from then
// on), whether they manage the cash, and their share units.
export function MemberDrawer({ open, onClose, businessId, editing, cashHolderId, defaultJoin }: MemberDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [joinedOn, setJoinedOn] = useState("");
  const [manager, setManager] = useState(false);
  const [shareUnits, setShareUnits] = useState(1);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setPhotoUrl(editing?.photoUrl ?? "");
      setName(editing?.name ?? "");
      setPhone(editing?.phone ?? "");
      setJoinedOn(editing ? (editing.joinedOn?.slice(0, 10) ?? "") : defaultJoin);
      setManager(!!editing && editing.id === cashHolderId);
      setShareUnits(editing ? Number(editing.shareUnits) : 1);
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

  const valid = name.trim().length > 0;
  // A photo still uploading lands in this form when it arrives, so the
  // drawer stays open until then, as it does while saving: shut and opened
  // for someone else, it would get their photo.
  const busy = isPending || uploading;

  function save(addAnother: boolean) {
    if (!valid || isPending) return;
    startTransition(async () => {
      const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);
      const input = { name: name.trim(), phone: phone.trim() || undefined, photoUrl: photoUrl || undefined, shareUnits, joinedOn: joinedOn || null };
      const result = await attempt(() => (editing ? updateGroupMemberAction(businessId, editing.id, input) : createGroupMemberAction(businessId, input)), offline, stale);
      if (!result.success) {
        toast.error(result.message ?? (editing ? t("Failed to update member") : t("Failed to add member")));
        return;
      }
      // The manager is the one who keeps the cash: a separate save, with its own answer.
      const id = editing?.id ?? result.data?.id;
      const role = id && manager !== (id === cashHolderId) ? await attempt(() => updateGroupSettingsAction(businessId, { cashHolderMemberId: manager ? id : null }), offline, stale) : { success: true };
      if (!role.success) toast.warning(t(manager ? "Saved, but they couldn't be made the manager" : "Saved, but they are still the manager"));
      else toast.success(editing ? t("Member updated") : t("Member added"));
      router.refresh();
      if (addAnother) {
        // The next person: a fresh name, phone and photo; the same joining day.
        setName("");
        setPhone("");
        setPhotoUrl("");
        setManager(false);
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
    <Drawer
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
            <Button type="button" variant="secondary" onClick={() => save(true)} disabled={!valid || isPending || uploading} className="mr-auto max-sm:flex-1">
              {t("Save & add another")}
            </Button>
          )}
          {/* Below md the X closes the sheet. */}
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="hidden px-3.5 md:inline-flex">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending || uploading} className="px-4.5 max-sm:flex-1">
            {isPending && <Loader />}
            {editing ? t("Save changes") : t("Add member")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} aria-label={t("Add a photo (optional)")} className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-line-strong bg-surface-sunken text-ink-muted hover:border-emerald hover:text-brand-ink disabled:opacity-60">
            {uploading ? <Loader size={20} /> : photoUrl ? photo : <Camera className="size-5.5" aria-hidden="true" />}
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

        <Field htmlFor="mem-name" label={label(t("Name"))}>
          <Input id="mem-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder="Mahin Rahman" />
        </Field>
        <Field htmlFor="mem-phone" label={label(t("Phone"), true)} hint={t("Used to send the monthly statement on WhatsApp.")}>
          <Input id="mem-phone" size="md" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} placeholder="01822-907316" className="tabular-nums" aria-describedby="mem-phone-hint" />
        </Field>

        <Field htmlFor="mem-join" label={label(t("Joins on"), !editing && !defaultJoin)} hint={joinedOn ? t("{name} shares costs from this date only. Earlier days stay as they are.", { name: name.trim() || t("They") }) : t("Shares every cost from the start.")}>
          <DayInput id="mem-join" size="md" value={joinedOn} onChange={setJoinedOn} aria-describedby="mem-join-hint" />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Role")}</legend>
          {/* Real radios under the cards: arrow keys move between them. */}
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((option) => {
              const on = option.value === manager;
              return (
                <label key={option.title} className={cn("relative flex h-13 cursor-pointer flex-col items-start justify-center gap-px rounded-md border px-3 text-left", FOCUS_WITHIN, on ? "border-[1.5px] border-emerald bg-mint-50/60" : "border-line bg-surface hover:border-input")}>
                  <input type="radio" name="mem-role" checked={on} onChange={() => setManager(option.value)} className="sr-only" />
                  <span className={cn("text-small text-ink", on ? "font-bold" : "font-semibold")}>{t(option.title)}</span>
                  <span className={cn("text-caption", on ? "text-ink-2" : "text-ink-muted")}>{t(option.sub)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-medium text-ink">{t("Share units")}</span>
            <span className="text-caption leading-normal text-ink-muted">{t("Only used when a cost is split by shares, for example a bigger room paying 1.5.")}</span>
          </div>
          <ShareStepper value={shareUnits} onChange={setShareUnits} />
        </div>

        <div className="flex items-start gap-2.5 rounded-[14px] bg-strip px-3.5 py-3 text-small leading-normal text-ink-soft">
          <Info className="mt-0.5 size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
          <span>{t("Members don't need their own login. You record contributions, expenses and meals for them.")}</span>
        </div>
      </div>
    </Drawer>
  );
}
