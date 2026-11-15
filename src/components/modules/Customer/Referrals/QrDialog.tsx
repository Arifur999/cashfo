"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { encodeQr, qrPath } from "@/lib/qr";

interface QrDialogProps {
  open: boolean;
  onClose: () => void;
  link: string;
  code: string;
  // The link's name in the title ("QR code · Facebook page"); none for the
  // main link on the dashboard.
  label?: string;
  // Added to the saved file's name ("facebook").
  tag?: string;
}

const QUIET = 4;
// Pixels per module in the saved PNG: about 400-700 px a side, sharp on a
// printed poster.
const PNG_SCALE = 12;

// The invite link as a QR code, drawn here in the browser, for a friend
// beside you to scan with their phone's camera, or saved as a PNG to print
// (ReferralDashboard's QR popup). Black on white in both themes: a scanner
// reads dark modules on a light ground.
export function QrDialog({ open, onClose, link, code, label, tag }: QrDialogProps) {
  const { t } = useLocale();
  const modules = useMemo(() => (open ? encodeQr(link) : null), [open, link]);
  const size = modules ? modules.length + QUIET * 2 : 0;

  const download = () => {
    if (!modules) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size * PNG_SCALE;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error(t("Couldn't save the QR code."));
      return;
    }
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#000";
    modules.forEach((row, y) => row.forEach((on, x) => on && context.fillRect((x + QUIET) * PNG_SCALE, (y + QUIET) * PNG_SCALE, PNG_SCALE, PNG_SCALE)));
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error(t("Couldn't save the QR code."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `smartly-invite-${code}${tag ? `-${tag}` : ""}.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t("Saved the QR code to your downloads."));
      onClose();
    }, "image/png");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="flex w-105 max-w-[calc(100vw-32px)] flex-col items-center gap-3 rounded-[20px] border-0 bg-surface px-7 py-6.5 text-center shadow-overlay ring-0">
        <DialogTitle className="text-h3 text-ink">{label ? t("QR code · {name}", { name: label }) : t("QR code")}</DialogTitle>
        <DialogDescription className="text-[13.5px] leading-[normal] text-ink-muted">{t("Friends scan it to sign up with your link. Print it for a poster or your shop counter.")}</DialogDescription>
        {modules ? (
          <svg role="img" aria-label={t("QR code for your invite link")} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="size-58 rounded-[14px] border border-line bg-white p-3">
            <path d={qrPath(modules, QUIET)} fill="#000" />
          </svg>
        ) : (
          <p className="py-6 text-small text-ink-muted">{t("This link is too long for a QR code.")}</p>
        )}
        <div className="flex w-full gap-2.5">
          <Button variant="secondary" onClick={onClose} className="h-10.5 flex-1">
            {t("Close")}
          </Button>
          <Button onClick={download} disabled={!modules} className="h-10.5 flex-1">
            {t("Download PNG")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
