"use client";

import { Eye, EyeOff, Link2Off } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptInviteAction, attachInviteAction } from "@/app/(auth)/join/[token]/_action";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import Chip, { type ChipTone } from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import type { GroupInvitePreview } from "@/lib/customer/api";
import { MEMBER_LOGIN_ROUTE } from "@/lib/authUtils";
import { MEMBER_ROLE_HINTS, MEMBER_ROLE_LABELS, memberAccessRole, passwordProblem, passwordStrength, USERNAME_PATTERN } from "@/lib/customer/groupAccess";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const ROLE_TONES: Record<string, ChipTone> = { EDITOR: "warning", VIEWER: "info", ADMIN: "mint", NONE: "neutral" };
const STRENGTH = [
  { word: "Too short", bar: "bg-line", text: "text-expense" },
  { word: "Weak", bar: "bg-expense", text: "text-expense" },
  { word: "Okay", bar: "bg-warning", text: "text-warning" },
  { word: "Good", bar: "bg-income", text: "text-income" },
  { word: "Strong", bar: "bg-forest", text: "text-income" },
];

// A link that no longer works: used, replaced by a newer one, run out, or
// the member's access was taken away -- all said the same way.
export function JoinLinkGone() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-start gap-3.5 rounded-[18px] border border-line bg-surface p-7">
      <span className="flex size-12 items-center justify-center rounded-[14px] bg-warning-soft text-warning">
        <Link2Off className="size-5.5" aria-hidden="true" />
      </span>
      <h1 className="text-[24px] font-bold tracking-[-0.02em] text-ink">{t("This link no longer works")}</h1>
      <p className="text-body leading-[1.55] text-ink-2">{t("It was already used, or your admin made a new one. Ask your group admin for a new link.")}</p>
      <Button asChild size="lg" className="rounded-full">
        <Link href={MEMBER_LOGIN_ROUTE}>{t("Go to log in")}</Link>
      </Button>
    </div>
  );
}

// An access link opened (the GroupLogin board's invite step): who it is for
// and their role; a join link asks for a username and a password and makes
// the login, a reset link asks for a new password. Someone already signed
// in may add the group to that account instead.
export default function JoinGroupForm({ token, invite, signedInAs }: { token: string; invite: GroupInvitePreview; signedInAs: string | null }) {
  const { t } = useLocale();
  const reset = invite.kind === "RESET";
  const [username, setUsername] = useState(invite.suggestedUsername ?? "");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<{ message: string; field?: "username" | "password" | "again" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const role = memberAccessRole({ role: invite.role });
  const strength = passwordStrength(password);

  const save = () => {
    const user = username.trim().toLowerCase();
    if (!reset && !USERNAME_PATTERN.test(user)) return setError({ message: t("Use 4 to 20 small letters, numbers, dot or underscore, like rakib.m"), field: "username" });
    const problem = passwordProblem(password, again);
    if (problem) return setError({ message: t(problem), field: problem.includes("match") ? "again" : "password" });
    startTransition(async () => {
      const answer = await acceptInviteAction(token, reset ? undefined : user, password);
      setError({ message: t(answer.message), field: answer.field });
    });
  };
  const attach = () =>
    startTransition(async () => {
      const answer = await attachInviteAction(token);
      setError({ message: t(answer.message) });
    });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">{reset ? t("Set a new password") : t("Join {group}", { group: invite.groupName })}</h1>
        <p className="text-body leading-normal text-ink-muted">
          {reset ? t("Your admin sent you a reset link. Pick a new password; your old one stops working.") : t("Choose a username and password. You will use them to log in from now on.")}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3.5">
        <Avatar name={invite.memberName} size={44} tone="soft" alt="" className="size-10.5" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold text-ink">{invite.memberName}</span>
          <span className="text-[12.5px] leading-[1.4] text-ink-muted">
            {invite.adminName ? (reset ? t("Admin: {name}", { name: invite.adminName }) : t("Invited by {name}", { name: invite.adminName })) : null}
            {invite.adminName ? " · " : ""}
            {invite.groupName}
          </span>
        </span>
        <Chip tone={ROLE_TONES[role]} className="shrink-0">
          {t(MEMBER_ROLE_LABELS[role])}
        </Chip>
      </div>
      <p className="-mt-2 text-[12.5px] leading-normal text-ink-2">
        {t(MEMBER_ROLE_LABELS[role])}: {t(MEMBER_ROLE_HINTS[role])}
      </p>

      {signedInAs && !reset && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-line bg-mint-50/60 px-3.5 py-3">
          <span className="text-small leading-[1.45] text-brand-ink">{t("You are signed in as {name}. Add {group} to this account instead of making a new login?", { name: signedInAs, group: invite.groupName })}</span>
          <Button variant="secondary" size="sm" className="self-start" onClick={attach} disabled={isPending}>
            {t("Add to my account")}
          </Button>
        </div>
      )}

      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Field htmlFor="join-user" label={t("Username")} hint={reset ? undefined : t("4 to 20 small letters, numbers, dot or underscore. You can also log in with your mobile number.")} error={error?.field === "username" ? error.message : undefined}>
          <Input
            id="join-user"
            size="lg"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            readOnly={reset}
            placeholder={t("e.g. tanvir")}
            value={reset ? (invite.username ?? "") : username}
            onChange={(event) => (setUsername(event.target.value), setError(null))}
            invalid={error?.field === "username"}
            className={cn(reset && "text-ink-2")}
            frameClassName={cn(reset && "bg-strip")}
          />
        </Field>
        <Field htmlFor="join-pw" label={reset ? t("New password") : t("Password")} error={error?.field === "password" ? error.message : undefined}>
          <Input
            id="join-pw"
            size="lg"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            maxLength={128}
            placeholder={t("At least 8 characters, with a letter and a number")}
            value={password}
            onChange={(event) => (setPassword(event.target.value), setError(null))}
            invalid={error?.field === "password"}
            trailing={
              <button type="button" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? t("Hide password") : t("Show password")} className="flex h-8.5 items-center gap-1.25 rounded-lg px-2.5 text-[13px] font-semibold text-emerald hover:bg-mint-50">
                {show ? <EyeOff className="size-3.75" aria-hidden="true" /> : <Eye className="size-3.75" aria-hidden="true" />}
                {show ? t("Hide") : t("Show")}
              </button>
            }
          />
        </Field>
        <div className="-mt-1 flex flex-col gap-1.5" aria-live="polite">
          <span aria-hidden="true" className="flex gap-1.5">
            {[1, 2, 3, 4].map((bar) => (
              <span key={bar} className={cn("h-1.25 flex-1 rounded-full", bar <= strength ? STRENGTH[strength].bar : "bg-line")} />
            ))}
          </span>
          <span className={cn("text-caption", password ? STRENGTH[strength].text : "text-ink-muted")}>{password ? t(STRENGTH[strength].word) : t("Use 8 or more characters. Mixing letters and numbers makes it stronger.")}</span>
        </div>
        <Field htmlFor="join-again" label={t("Confirm password")} error={error?.field === "again" ? error.message : undefined}>
          <Input id="join-again" size="lg" type={show ? "text" : "password"} autoComplete="new-password" maxLength={128} value={again} onChange={(event) => (setAgain(event.target.value), setError(null))} invalid={error?.field === "again"} />
        </Field>
        {error && !error.field && (
          <p role="alert" className="rounded-[10px] border border-expense/30 bg-expense-soft px-3 py-2.5 text-small leading-[1.45] text-expense">
            {error.message}
          </p>
        )}
        <Button type="submit" size="xl" className="h-12.5 w-full rounded-full" disabled={isPending}>
          {isPending && <Loader />}
          {reset ? t("Save and log in") : t("Join and log in")}
        </Button>
        <Link href={MEMBER_LOGIN_ROUTE} className="self-center text-[13.5px] font-semibold text-ink-2 hover:underline">
          {t("Not you? Go to log in")}
        </Link>
      </form>
    </>
  );
}
