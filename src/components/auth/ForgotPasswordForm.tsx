"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { forgotPasswordAction } from "@/app/(auth)/forgot-password/_action";
import { authDictionary, type AuthLang } from "@/lib/authI18n";
import { LanguageToggle } from "./LanguageToggle";

export function ForgotPasswordForm() {
  const [lang, setLang] = useState<AuthLang>("EN");
  const t = authDictionary[lang];

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(email);
      if (result.success) {
        setSent(true);
      } else {
        setError(result.message ?? null);
      }
    });
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center shadow-lg shadow-black/5">
        <LanguageToggle value={lang} onChange={setLang} />
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">{t.resetLinkSentTitle}</h1>
        <p className="mb-6 text-sm text-neutral-500">{t.resetLinkSentMessage}</p>
        <Link href="/login" className="text-sm font-medium text-brand-primary hover:underline">
          {t.signInInstead}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-lg shadow-black/5">
      <LanguageToggle value={lang} onChange={setLang} />

      <h1 className="mb-1 text-xl font-semibold text-neutral-900">{t.forgotPasswordTitle}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t.forgotPasswordSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-neutral-700">
            {t.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder={t.emailPlaceholder}
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
          {isPending ? t.sendingResetLink : t.sendResetLink}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          {t.signInInstead}
        </Link>
      </p>
    </div>
  );
}
