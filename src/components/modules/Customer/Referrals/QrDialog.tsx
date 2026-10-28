"use client";

import { Copy, X } from "lucide-react";
import { useMemo } from "react";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { encodeQr, qrPath } from "@/lib/qr";
import { useCopy } from "./ReferralBits";

interface QrDialogProps {
  open: boolean;
  onClose: () => void;
  link: string;
  code: string;
}

const QUIET = 4;

// The invite link as a QR code, drawn here in the browser, for a friend
// beside you to scan with their phone's camera. Black on white in both
// themes: a scanner reads dark modules on a light ground.
export function QrDialog({ open, onClose, link, code }: QrDialogProps) {
  const { t } = useLocale();
  const copy = useCopy();
  const modules = useMemo(() => (open ? encodeQr(link) : null), [open, link]);
  const size = modules ? modules.length + QUIET * 2 : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="w-100 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0">
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-h3 text-ink">{t("Scan to join")}</DialogTitle>
            <DialogDescription className="text-small text-ink-muted">{t("Your friend points their phone's camera here and signs up with your link.")}</DialogDescription>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 py-5">
          {modules ? (
            <svg role="img" aria-label={t("QR code for your invite link")} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="size-60 rounded-xl border border-line bg-white">
              <path d={qrPath(modules, QUIET)} fill="#000" />
            </svg>
          ) : (
            <p className="text-small text-ink-muted">{t("This link is too long for a QR code.")}</p>
          )}
          <span className="text-small text-ink-muted">
            {t("Code")} <b className="font-mono font-bold tracking-wider text-ink">{code}</b>
          </span>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            {t("Close")}
          </Button>
          <Button onClick={() => copy(link, t("Link copied"))}>
            <Copy />
            {t("Copy link")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
