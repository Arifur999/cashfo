"use client";

import { ImagePlus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { removeCoverAction, uploadAvatarAction, uploadCoverAction } from "@/lib/customer/authActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { COVER_FALLBACK } from "./ProfileCard";

interface ChangePhotoDialogProps {
  // The round photo, or the wide cover over the profile.
  kind: "photo" | "cover";
  open: boolean;
  onClose: () => void;
}

const COPY = {
  photo: { title: "Change photo", hint: "JPG, PNG, WEBP or GIF, up to 5 MB. A square photo looks best.", done: "Photo updated", failed: "Failed to upload avatar" },
  cover: { title: "Change cover", hint: "JPG, PNG, WEBP or GIF, up to 5 MB. A wide photo looks best.", done: "Cover updated", failed: "Failed to upload the cover" },
} as const;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Pick a photo (or a cover), see it, upload it; a cover can also be taken
// off, back to the gradient.
export function ChangePhotoDialog({ kind, open, onClose }: ChangePhotoDialogProps) {
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
        const result = kind === "cover" ? await uploadCoverAction(formData) : await uploadAvatarAction(formData);
        if (result.success) {
          toast.success(t(copy.done));
          router.refresh();
          onClose();
        } else {
          toast.error(t(result.message ?? copy.failed));
        }
      } catch {
        toast.error(t(copy.failed));
      }
    });
  }

  function removeCover() {
    if (isPending) return;
    startTransition(async () => {
      const result = await removeCoverAction();
      if (result.success) {
        toast.success(t("Cover removed"));
        router.refresh();
        onClose();
      } else {
        toast.error(t(result.message ?? "Failed to remove the cover"));
      }
    });
  }

  const copy = COPY[kind];
  const shown = preview ?? (kind === "cover" ? (user.coverUrl ?? null) : user.avatarUrl);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border border-line bg-surface p-0 shadow-overlay ring-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <AlertDialogTitle className="text-h3 text-ink">{t(copy.title)}</AlertDialogTitle>
          <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t(copy.hint)}</AlertDialogDescription>
        <div className="flex flex-col items-center gap-4 px-6 py-5">
          {/* A local preview or the photo; without one, the top bar's avatar
              (forest, mint initials) as large as the preview. */}
          {kind === "cover" ? (
            <div className={cn("h-28 w-full rounded-[12px] bg-cover bg-center", !shown && COVER_FALLBACK)} style={shown ? { backgroundImage: `url("${shown}")` } : undefined} />
          ) : (
            <Avatar name={user.name} src={shown} size={120} alt="" className="font-extrabold" />
          )}
          <input ref={fileInput} type="file" accept={ALLOWED_TYPES.join(",")} className="hidden" onChange={picked} />
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={isPending} className="pointer-coarse:h-11">
            <ImagePlus />
            {t(file ? "Pick another" : "Choose a photo")}
          </Button>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line bg-strip px-6 py-4">
          {kind === "cover" && user.coverUrl && !file && (
            <Button type="button" variant="ghost" onClick={removeCover} disabled={isPending} className="mr-auto px-3 text-expense hover:bg-expense-soft hover:text-expense pointer-coarse:h-11">
              <Trash2 />
              {t("Remove cover")}
            </Button>
          )}
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
