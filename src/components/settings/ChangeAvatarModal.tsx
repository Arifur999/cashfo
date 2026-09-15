"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { uploadAvatarAction } from "@/lib/authActions";

interface ChangeAvatarModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl: string | null;
  name: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Opened from ProfileTab's "Change Avatar" button -- a real confirm step
// (pick a file, see it previewed, then explicitly "Upload Avatar") rather
// than the old behaviour of uploading the instant a file was picked, which
// gave no chance to back out of the wrong file.
export function ChangeAvatarModal({ open, onClose, currentAvatarUrl, name }: ChangeAvatarModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, startTransition] = useTransition();

  // Render-time reset (same pattern as every other modal in this app) --
  // drop any picked-but-not-uploaded file the moment the modal is reopened,
  // and revoke its object URL so it doesn't leak.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }
  }

  function handleChoose() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or GIF images are allowed");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image must be 5MB or smaller");
      return;
    }

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setSelectedFile(file);
  }

  function handleUpload() {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      if (result.success) {
        toast.success("Avatar updated");
        router.refresh();
        onClose();
      } else {
        toast.error(result.message ?? "Failed to upload avatar");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Change Profile Picture">
      <p className="-mt-2 mb-5 text-sm text-neutral-500">Upload a new profile picture. Recommended size: 400x400px</p>

      <div className="flex flex-col items-center gap-3">
        {previewUrl || currentAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local object URL preview or a backend-served upload, neither is next/image-friendly.
          <img src={previewUrl ?? currentAvatarUrl ?? undefined} alt={name} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100 text-2xl font-semibold text-neutral-500">
            {initials(name)}
          </span>
        )}

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelected} />
        <button
          type="button"
          onClick={handleChoose}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Upload className="h-3.5 w-3.5" /> Choose Image
        </button>
        <p className="text-xs text-neutral-400">JPG, PNG or GIF (max 5MB)</p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!selectedFile || isUploading}
          onClick={handleUpload}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          Upload Avatar
        </button>
      </div>
    </Modal>
  );
}
