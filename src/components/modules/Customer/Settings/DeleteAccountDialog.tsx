"use client";

import { CircleCheck, Clock, TriangleAlert, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { deleteAccountAction, getDeletionPreviewAction } from "@/lib/customer/securityActions";
import { cleanBackupCode, cleanTotpCode, DELETE_WORD, DELETION_GRACE_DAYS, deletionItems, TWO_STEP_CODE_LENGTH, twoStepProblem, type DeletionPreview } from "@/lib/customer/securityDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  // "Download my data first": the page's own download.
  onDownload: () => void;
}

// Delete my account (design-v4 DeleteAccountDialog): what goes, the 30 days
// to change your mind, the password (or a recent sign-in for a Google-only
// account), DELETE typed out, and with two-step on a code. Once asked, the
// account is locked and signed out everywhere; the dialog says until when
// it can still be restored, then signs this device out too.
export function DeleteAccountDialog({ open, onClose, onDownload }: DeleteAccountDialogProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const hasPassword = user.hasPassword !== false;
  const twoStep = Boolean(user.twoFactorEnabled);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [signingOut, startSigningOut] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPassword("");
      setWord("");
      setCode("");
      setUseBackup(false);
      setProblem(null);
      setScheduledFor(null);
    }
  }

  // What goes is read each time it opens; the list shows without counts
  // until it arrives.
  useEffect(() => {
    if (!open) return;
    let live = true;
    void getDeletionPreviewAction().then((result) => {
      if (live) setPreview(result.success ? (result.data ?? null) : null);
    });
    return () => {
      live = false;
    };
  }, [open]);

  const graceDays = preview?.graceDays ?? DELETION_GRACE_DAYS;
  const wordOk = word.trim() === DELETE_WORD;
  const codeOk = !twoStep || (useBackup ? code.replace("-", "").length === 8 : code.length === TWO_STEP_CODE_LENGTH);
  const ready = wordOk && codeOk && (!hasPassword || password.length > 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || isPending) return;
    setProblem(null);
    startTransition(async () => {
      const result = await deleteAccountAction({ password: hasPassword ? password : undefined, ...(twoStep && (useBackup ? { backupCode: code } : { code })) });
      if (result.success && result.data) {
        setScheduledFor(result.data.scheduledFor);
      } else if (result.status === 403 && result.reason !== "RECENT_SIGN_IN_REQUIRED") {
        setProblem(t("This is a read-only view of the account. Nothing can be changed from it."));
      } else {
        setProblem(t(twoStepProblem(result.reason, result.message ?? "Couldn't delete your account")));
      }
    });
  }

  // The API signed every device out already; this one forgets its cookies.
  const signOut = () => startSigningOut(() => logoutAction());

  if (scheduledFor) {
    return (
      <AlertDialog open={open} onOpenChange={(next) => !next && signOut()}>
        <AlertDialogContent className="w-130 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-2xl border-0 bg-surface p-0 shadow-overlay ring-0">
          <div className="flex gap-3.5 px-6 pt-5.5 pb-5">
            <span className="flex size-10.5 shrink-0 items-center justify-center rounded-field bg-mint-50 text-emerald [&_svg]:size-5">
              <CircleCheck aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <AlertDialogTitle className="text-[19px] font-semibold text-ink">{t("Your account will be deleted")}</AlertDialogTitle>
              <AlertDialogDescription className="text-body leading-normal text-ink-soft">
                {t("It's locked now and signed out everywhere. Sign in before {date} to keep it; after that it is gone for good.", { date: formatDate(scheduledFor, "d MMM yyyy", locale) })}
              </AlertDialogDescription>
            </div>
          </div>
          <div className="flex justify-end border-t border-line bg-strip px-6 py-3.5">
            <Button onClick={signOut} disabled={signingOut} autoFocus>
              {signingOut && <Loader onDark />}
              {t("Sign out")}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const items = deletionItems(preview);
  // "Type DELETE to confirm", the word set apart in its own face.
  const confirmLabel = t("Type {word} to confirm").split("{word}");

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-130 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-2xl border-0 bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} noValidate className="flex max-h-[92vh] flex-col">
          <div className="relative flex gap-3.5 px-6 pt-5.5">
            <span className="flex size-10.5 shrink-0 items-center justify-center rounded-field bg-expense-soft text-expense-fill [&_svg]:size-5">
              <TriangleAlert aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1 pr-6">
              <AlertDialogTitle className="text-[19px] font-semibold text-ink">{t("Delete your account?")}</AlertDialogTitle>
              <AlertDialogDescription className="text-body leading-normal text-ink-soft">{t("This removes your account and everything in it:")}</AlertDialogDescription>
            </div>
            <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="absolute top-4 right-4 flex size-8.5 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken disabled:opacity-50 pointer-coarse:size-11">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-3.5 overflow-y-auto px-6 pt-3.5 pb-5">
            <ul className="flex flex-col gap-1.75 sm:ml-14">
              {items.map((item) => (
                <li key={item.key} className="flex gap-2 text-[13.5px] leading-[1.45] text-ink-2">
                  <X className="mt-0.5 size-3.5 shrink-0 text-expense-fill" strokeWidth={2.5} aria-hidden="true" />
                  <span>{t(item.text, item.amount ? { amount: formatCurrency(item.amount, "BDT", locale) } : undefined)}</span>
                </li>
              ))}
            </ul>
            {preview && (
              <p className="text-caption text-ink-muted sm:ml-14">
                {t("{wallets} wallets, {transactions} transactions, {goals} savings goals, {assets} assets and {loans} loan contacts.", {
                  wallets: formatCount(preview.wallets, locale),
                  transactions: formatCount(preview.transactions, locale),
                  goals: formatCount(preview.savingsGoals, locale),
                  assets: formatCount(preview.assets, locale),
                  loans: formatCount(preview.loanContacts, locale),
                })}
              </p>
            )}
            <div className="flex items-start gap-2.5 rounded-field border border-warning-line bg-warning-50 px-3.5 py-3 text-small leading-normal text-warning-ink">
              <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                {preview ? t("We keep it for {days} days. Sign in before {date} to cancel. After that it is gone for good.", { days: formatCount(graceDays, locale), date: formatDate(preview.deletionDate, "d MMM yyyy", locale) }) : t("We keep it for {days} days. Sign in before then to cancel. After that it is gone for good.", { days: formatCount(graceDays, locale) })}{" "}
                <button type="button" onClick={onDownload} className="font-semibold text-warning-ink underline pointer-coarse:min-h-11">
                  {t("Download my data first")}
                </button>
              </span>
            </div>
            {hasPassword ? (
              <Field htmlFor="da-pass" label={t("Your account password")}>
                <PasswordField id="da-pass" size="md" className="text-body-lg" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
              </Field>
            ) : (
              <p className="text-small text-ink-muted">{t("You sign in with Google, so a sign-in in the last 10 minutes confirms it's you.")}</p>
            )}
            {twoStep && (
              <Field
                htmlFor="da-code"
                label={t(useBackup ? "A backup code" : "Code from your authenticator app")}
                aside={
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackup(!useBackup);
                      setCode("");
                    }}
                    className="text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11"
                  >
                    {t(useBackup ? "Use the app instead" : "Use a backup code")}
                  </button>
                }
              >
                <Input id="da-code" size="md" value={code} onChange={(event) => setCode(useBackup ? cleanBackupCode(event.target.value) : cleanTotpCode(event.target.value))} inputMode={useBackup ? "text" : "numeric"} autoComplete="one-time-code" lang="en" className="font-mono text-body-lg tracking-[0.2em]" />
              </Field>
            )}
            <Field
              htmlFor="da-confirm"
              label={
                <span>
                  {confirmLabel[0]}
                  {/* The word itself stays English: it is typed exactly. */}
                  <b lang="en" className="font-mono">
                    {DELETE_WORD}
                  </b>
                  {confirmLabel[1]}
                </span>
              }
            >
              <Input
                id="da-confirm"
                size="md"
                value={word}
                onChange={(event) => setWord(event.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                lang="en"
                className="font-mono text-[15px] tracking-[0.08em]"
                frameClassName={cn(wordOk && "border-[1.5px] border-expense-fill focus-within:border-expense-fill focus-within:error-halo")}
              />
            </Field>
            {problem && (
              <p role="alert" className="text-small text-expense">
                {problem}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="px-3.5">
              {t("Keep my account")}
            </Button>
            <Button type="submit" variant="danger" disabled={!ready || isPending} className="px-4.5">
              {isPending && <Loader onDark />}
              {t("Delete my account")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
