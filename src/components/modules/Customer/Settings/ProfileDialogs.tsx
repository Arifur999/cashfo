"use client";

import { ArrowRight, Mail, TriangleAlert } from "lucide-react";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const FRAME = "flex w-105 max-w-[calc(100vw-32px)] flex-col gap-4 rounded-[20px] border-0 bg-surface p-6 shadow-overlay ring-0";
const PILL = "flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors disabled:opacity-60";

// "Remove your photo?" (SettingsProfile board): the photo, an arrow, and the
// initials people will see instead.
export function RemovePhotoDialog({ open, name, photo, busy, onClose, onRemove }: { open: boolean; name: string; photo: string | null; busy: boolean; onClose: () => void; onRemove: () => void }) {
  const { t } = useLocale();
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className={FRAME}>
        <div className="flex items-center gap-3.5" aria-hidden="true">
          <Avatar name={name} src={photo} size={48} alt="" />
          <ArrowRight className="size-5 text-ink-faint" strokeWidth={2} />
          <Avatar name={name} src={null} size={48} alt="" />
        </div>
        <div className="flex flex-col gap-1.5">
          <AlertDialogTitle className="text-[18px] font-semibold text-ink">{t("Remove your photo?")}</AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-normal text-ink-soft">{t("People in your groups will see your initials instead. You can add a photo again any time.")}</AlertDialogDescription>
        </div>
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={busy} className={cn(PILL, "border border-input bg-surface text-ink hover:bg-surface-sunken")}>
            {t("Keep photo")}
          </button>
          <button type="button" onClick={onRemove} disabled={busy} className={cn(PILL, "bg-expense-fill px-4.5 text-white hover:bg-expense")}>
            {busy && <Loader size={14} onDark label={t("Loading...")} />}
            {t("Remove photo")}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface CheckInboxDialogProps {
  open: boolean;
  email: string;
  // A resend in flight, or done (the button says "Sent again").
  resending: boolean;
  resent: boolean;
  onOpened: () => void;
  onResend: () => void;
  onClose: () => void;
}

// "Check your inbox" after a verification email went out: where it went,
// what to do, "I've opened the link" (reads the account again) and a resend.
export function CheckInboxDialog({ open, email, resending, resent, onOpened, onResend, onClose }: CheckInboxDialogProps) {
  const { t } = useLocale();
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="flex w-110 max-w-[calc(100vw-32px)] flex-col items-center gap-3.5 rounded-[20px] border-0 bg-surface px-6.5 pt-7 pb-5.5 text-center shadow-overlay ring-0">
        <span className="flex size-15 items-center justify-center rounded-full bg-emerald-soft text-emerald">
          <Mail className="size-7" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <AlertDialogTitle className="text-[19px] font-semibold text-ink">{t("Check your inbox")}</AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-[1.55] text-ink-soft">
            {t("We sent a link to {email}. It works for 24 hours.", { email })}
          </AlertDialogDescription>
        </div>
        <ol className="w-full list-decimal rounded-xl bg-strip py-3 pr-3.5 pl-8 text-left text-[13px] leading-[1.6] text-ink-2">
          <li>{t("Open the email from Smartly.")}</li>
          <li>{t('Tap "Verify my email".')}</li>
          <li>{t("Come back here. The badge turns green.")}</li>
        </ol>
        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={onOpened} className="h-10.5 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground hover:bg-emerald-hover">
            {t("I've opened the link")}
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={resending || resent}
            className={cn("flex h-10.5 items-center justify-center gap-2 rounded-full border border-input bg-surface text-[14px] font-semibold hover:bg-surface-sunken disabled:hover:bg-surface", resent ? "text-ink-faint" : "text-ink")}
          >
            {resending && <Loader size={14} label={t("Loading...")} />}
            {resent ? t("Sent again") : t("Resend email")}
          </button>
        </div>
        <span className="text-[12px] text-ink-faint">{t("Can't find it? Check Spam or Promotions.")}</span>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// "Leave without saving?": a link pressed while the profile has changes.
export function LeaveDialog({ open, onStay, onLeave }: { open: boolean; onStay: () => void; onLeave: () => void }) {
  const { t } = useLocale();
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onStay()}>
      <AlertDialogContent className={FRAME}>
        <span className="flex size-11 items-center justify-center rounded-xl bg-warning-soft text-warning">
          <TriangleAlert className="size-5.5" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <AlertDialogTitle className="text-[18px] font-semibold text-ink">{t("Leave without saving?")}</AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-normal text-ink-soft">{t("You changed your profile but did not save it. If you leave now, those changes are lost.")}</AlertDialogDescription>
        </div>
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onLeave} className={cn(PILL, "border border-input bg-surface text-expense hover:bg-expense-soft")}>
            {t("Leave without saving")}
          </button>
          <button type="button" onClick={onStay} className={cn(PILL, "bg-primary px-4.5 text-primary-foreground hover:bg-emerald-hover")}>
            {t("Keep editing")}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
