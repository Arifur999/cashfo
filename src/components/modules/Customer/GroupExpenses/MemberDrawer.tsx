"use client";

import { ImagePlus, Info, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupMember } from "@/lib/customer/api";
import { createGroupMemberAction, updateGroupMemberAction, uploadGroupMemberPhotoAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface MemberDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: GroupMember | null;
}

// Add or edit a member in the design's drawer: a photo, the name and a
// phone for sending the statement.
export function MemberDrawer({ open, onClose, businessId, editing }: MemberDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setPhotoUrl(editing?.photoUrl ?? "");
      setName(editing?.name ?? "");
      setPhone(editing?.phone ?? "");
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { name: name.trim(), phone: phone.trim() || undefined, photoUrl: photoUrl || undefined };
      const result = editing ? await updateGroupMemberAction(businessId, editing.id, input) : await createGroupMemberAction(businessId, input);
      if (result.success) {
        toast.success(editing ? t("Member updated") : t("Member added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? (editing ? t("Failed to update member") : t("Failed to add member")));
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
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-115" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{editing ? t("Edit member") : t("Add member")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} aria-label={t("Add a photo (optional)")} className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-line-strong bg-cream text-ink-muted hover:border-emerald hover:text-emerald disabled:opacity-60">
                {uploading ? <Loader size={20} /> : photoUrl ? photo : <ImagePlus className="size-5.5" aria-hidden="true" />}
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
              <Input id="mem-phone" size="md" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} placeholder="01822-907316" className="tabular-nums" />
            </Field>

            <div className="flex items-start gap-3 rounded-md bg-cream px-4 py-3 text-small leading-relaxed text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>{t("Members don't need their own login. You record contributions and expenses for them.")}</span>
            </div>
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending || uploading} className="px-5">
              {isPending && <Loader />}
              {editing ? t("Save changes") : t("Add member")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
