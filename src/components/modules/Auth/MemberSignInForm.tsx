"use client";

import { CircleAlert, Eye, EyeOff, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { memberSignInAction } from "@/app/(auth)/group-login/_action";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { LOGIN_ROUTE, memberJoinPath } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PopupDialog } from "../Customer/Shared/PopupDialog";
import AuthHeading from "./AuthHeading";

// What an access link carries: the token at the end of …/join/<token>, or
// the token pasted alone.
export function tokenFromLink(text: string): string | null {
  const raw = text.trim();
  const token = raw.includes("/join/") ? (raw.split("/join/")[1] ?? "").split(/[?#/\s]/)[0] : raw;
  return /^[A-Za-z0-9_-]{20,100}$/.test(token) ? token : null;
}

// Group Expense's member sign-in (the GroupLogin board): username or mobile
// number and password; a pasted access link opens its page; "Forgot
// password?" says how the group admin sends a reset link. The admin's own
// sign-in is the main page.
export default function MemberSignInForm({ accessChanged = false }: { accessChanged?: boolean }) {
  const { t } = useLocale();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkText, setLinkText] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const answer = await memberSignInAction(identifier, password);
      // Success redirects; only a refusal comes back.
      setError(t(answer.message, answer.values));
    });

  const openLink = () => {
    if (!linkText.trim()) return setLinkError(t("Paste the link your admin sent you."));
    const token = tokenFromLink(linkText);
    if (!token) return setLinkError(t("This link no longer works. Ask your group admin for a new one."));
    router.push(memberJoinPath(token));
  };

  return (
    <>
      <AuthHeading title="Log in" subtitle={t("Use the username and password you set from your access link.")} />
      {accessChanged && (
        <p role="status" className="rounded-xl border border-warning-line bg-warning-soft px-3 py-2.5 text-small leading-[1.45] text-warning-ink">
          {t("You were signed out because your access changed. Ask your group admin if this is a mistake.")}
        </p>
      )}
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field htmlFor="member-id" label={t("Username or mobile number")}>
          <Input id="member-id" size="lg" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} placeholder={t("e.g. arif or 01819-205377")} value={identifier} onChange={(event) => (setIdentifier(event.target.value), setError(null))} invalid={!!error && !identifier.trim()} autoFocus />
        </Field>
        <Field htmlFor="member-pw" label={t("Password")}>
          <Input
            id="member-pw"
            size="lg"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            maxLength={128}
            placeholder={t("Your password")}
            value={password}
            onChange={(event) => (setPassword(event.target.value), setError(null))}
            trailing={
              <button type="button" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? t("Hide password") : t("Show password")} className="flex h-8.5 items-center gap-1.25 rounded-lg px-2.5 text-[13px] font-semibold text-emerald hover:bg-mint-50">
                {show ? <EyeOff className="size-3.75" aria-hidden="true" /> : <Eye className="size-3.75" aria-hidden="true" />}
                {show ? t("Hide") : t("Show")}
              </button>
            }
          />
        </Field>
        {error && (
          <p role="alert" className="flex gap-2 rounded-[10px] border border-expense/30 bg-expense-soft px-3 py-2.5 text-small leading-[1.45] text-expense">
            <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <Button type="submit" size="xl" className="h-12.5 w-full rounded-full" disabled={isPending}>
          {isPending && <Loader />}
          {t("Log in")}
        </Button>
        <button type="button" onClick={() => setForgotOpen(true)} className="self-center text-[13.5px] font-semibold text-emerald hover:underline">
          {t("Forgot password?")}
        </button>
      </form>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-3.5 py-3">
        <label htmlFor="member-link" className="text-small font-semibold text-ink-2">
          {t("Have an access link?")} <span className="font-normal text-ink-muted">{t("Paste it here")}</span>
        </label>
        <div className="flex gap-2">
          <Input id="member-link" size="md" autoCapitalize="none" spellCheck={false} placeholder="https://…/join/…" value={linkText} onChange={(event) => (setLinkText(event.target.value), setLinkError(null))} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), openLink())} invalid={!!linkError} frameClassName="min-w-0 flex-1" />
          <Button variant="secondary" className="h-11 rounded-full border-emerald text-emerald" onClick={openLink}>
            {t("Open")}
          </Button>
        </div>
        {linkError && (
          <span role="alert" className="text-caption text-expense">
            {linkError}
          </span>
        )}
      </div>

      <p className="text-center text-small text-ink-muted">
        {t("Group admin?")}{" "}
        <Link href={LOGIN_ROUTE} className="font-semibold text-emerald hover:underline">
          {t("Open the Smartly app")}
        </Link>
      </p>

      <PopupDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        width={480}
        title={t("Forgot your password?")}
        sub={t("Your group admin can send you a reset link. It takes them a minute.")}
        lead={
          <span className="flex size-10.5 shrink-0 items-center justify-center rounded-xl bg-emerald-soft text-emerald">
            <KeyRound className="size-5" aria-hidden="true" />
          </span>
        }
        footer={<Button onClick={() => setForgotOpen(false)}>{t("Got it")}</Button>}
      >
        <ol className="flex list-decimal flex-col gap-1 pl-4.5 text-[13.5px] leading-normal text-ink-2">
          <li>{t("Ask your admin for a reset link.")}</li>
          <li>{t("They open Members in the Smartly app, tap the key next to your name and choose Send a reset link.")}</li>
          <li>{t("Open the link, set a new password, and you are logged in. Your old password works until then.")}</li>
        </ol>
        <p className="rounded-[10px] bg-strip px-3 py-2.5 text-small leading-normal text-ink-2">{t("Signed up with your own email? Use Forgot password on the main sign-in page instead.")}</p>
      </PopupDialog>
    </>
  );
}
