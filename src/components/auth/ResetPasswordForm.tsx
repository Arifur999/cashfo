"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { resetPasswordAction } from "@/app/(auth)/reset-password/_action";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { authDictionary, type AuthLang } from "@/lib/authI18n";
import { LanguageToggle } from "./LanguageToggle";

const PASSWORD_LETTER_NUMBER_REGEX = /(?=.*[A-Za-z])(?=.*\d)/;

export function ResetPasswordForm() {
  const [lang, setLang] = useState<AuthLang>("EN");
  const t = authDictionary[lang];

  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center shadow-lg shadow-black/5">
        <LanguageToggle value={lang} onChange={setLang} />
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">{t.invalidOrExpiredLink}</h1>
        <Link href="/forgot-password" className="text-sm font-medium text-brand-primary hover:underline">
          {t.requestNewLink}
        </Link>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    if (!PASSWORD_LETTER_NUMBER_REGEX.test(newPassword)) {
      setError(t.passwordNeedsLetterNumber);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t.passwordsDontMatch);
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordAction(token as string, newPassword);
      if (result && !result.success) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-lg shadow-black/5">
      <LanguageToggle value={lang} onChange={setLang} />

      <h1 className="mb-1 text-xl font-semibold text-neutral-900">{t.resetPasswordTitle}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t.resetPasswordSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium text-neutral-700">
            {t.newPassword}
          </label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder={t.passwordPlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmNewPassword" className="text-sm font-medium text-neutral-700">
            {t.confirmNewPassword}
          </label>
          <PasswordInput
            id="confirmNewPassword"
            name="confirmNewPassword"
            required
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            placeholder={t.confirmPasswordPlaceholder}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-brand-danger/10 px-3.5 py-2.5 text-sm text-brand-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? t.resettingPassword : t.resetPasswordButton}
        </button>
      </form>

      {error && (
        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link href="/forgot-password" className="font-medium text-brand-primary hover:underline">
            {t.requestNewLink}
          </Link>
        </p>
      )}
    </div>
  );
}
