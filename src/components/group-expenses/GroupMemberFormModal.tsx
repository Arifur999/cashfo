"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { createGroupMemberAction, updateGroupMemberAction, uploadGroupMemberPhotoAction } from "@/lib/groupExpensesActions";
import type { GroupMember } from "@/lib/api";
import { contactInitials } from "@/lib/contactDisplay";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface GroupMemberFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingMember: GroupMember | null;
}

export function GroupMemberFormModal({ open, onClose, businessId, editingMember }: GroupMemberFormModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingMember?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editingMember?.name ?? "");
      setPhone(editingMember?.phone ?? "");
      setPhotoUrl(editingMember?.photoUrl ?? "");
    }
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadGroupMemberPhotoAction(businessId, formData);
    if (result.success && result.data) {
      setPhotoUrl(result.data.url);
    } else {
      toast.error(result.message ?? t("Failed to upload photo"));
    }
    setUploadingPhoto(false);
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingMember
        ? await updateGroupMemberAction(businessId, editingMember.id, { name, phone: phone || undefined, photoUrl })
        : await createGroupMemberAction(businessId, { name, phone: phone || undefined, photoUrl: photoUrl || undefined });

      if (result.success) {
        toast.success(editingMember ? t("Member updated") : t("Member added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save member"));
      }
    });
  }

  const isValid = name.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingMember ? t("Edit Member") : t("Add Member")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Photo")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-semibold text-neutral-500">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Member" className="h-14 w-14 object-cover" />
              ) : (
                contactInitials(name || "?")
              )}
            </div>
            <label
              htmlFor="group-member-photo-input"
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {photoUrl ? t("Change Photo") : t("Upload Photo")}
            </label>
            <input
              id="group-member-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
              className="hidden"
            />
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl("")}
                title={t("Remove photo")}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={t("e.g. Rahim")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Phone")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingMember ? t("Save Changes") : t("Add")}
        </button>
      </div>
    </Modal>
  );
}
