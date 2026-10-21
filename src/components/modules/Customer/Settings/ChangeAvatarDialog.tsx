"use client";

import { ImagePlus, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { uploadAvatarAction } from "@/lib/customer/authActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getInitials } from "@/lib/text";

interface ChangeAvatarDialogProps {
  open: boolean;
  onClose: () => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Pick a photo, see it, upload it.
export function ChangeAvatarDialog({ open, onClose }: ChangeAvatarDialogProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A fresh pick every time the dialog opens; the old preview's URL is
  // released.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFile(null);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }
  }

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (!ALLOWED_TYPES.includes(next.type)) {
      toast.error(t("Only JPG, PNG, WEBP, or GIF images are allowed"));
      return;
    }
    if (next.size > MAX_SIZE_BYTES) {
      toast.error(t("Image must be 5MB or smaller"));
      return;
    }
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
    setFile(next);
  }

  function upload() {
    if (!file || isPending) return;
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        const result = await uploadAvatarAction(formData);
        if (result.success) {
          toast.success(t("Photo updated"));
          router.refresh();
          onClose();
        } else {
          toast.error(result.message ?? t("Failed to upload avatar"));
        }
      } catch {
        toast.error(t("Failed to upload avatar"));
      }
    });
  }

  const shown = preview ?? user.avatarUrl;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <AlertDialogTitle className="text-h3 text-ink">{t("Change photo")}</AlertDialogTitle>
          <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("JPG, PNG, WEBP or GIF, up to 5 MB. A square photo looks best.")}</AlertDialogDescription>
        <div className="flex flex-col items-center gap-4 px-6 py-5">
          {shown ? (
            // A local preview or a backend-served upload, so a plain <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="size-30 rounded-full object-cover" />
          ) : (
            // The top bar's avatar (forest, mint initials), as large as the preview.
            <span aria-hidden="true" className="flex size-30 items-center justify-center rounded-full bg-forest text-display text-mint-200">
              {getInitials(user.name) || "?"}
            </span>
          )}
          <input ref={fileInput} type="file" accept={ALLOWED_TYPES.join(",")} className="hidden" onChange={picked} />
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={isPending} className="pointer-coarse:h-11">
            <ImagePlus />
            {t(file ? "Pick another" : "Choose a photo")}
          </Button>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line bg-strip px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="pointer-coarse:h-11">
            {t("Cancel")}
          </Button>
          <Button type="button" variant="action" onClick={upload} disabled={!file || isPending} className="px-5 pointer-coarse:h-11">
            {isPending ? <Loader /> : <Upload />}
            {t("Upload")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
