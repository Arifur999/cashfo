"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { loginAction } from "@/app/(auth)/login/_action";
import { authDictionary, type AuthLang } from "@/lib/authI18n";
import { LanguageToggle } from "./LanguageToggle";

export function LoginForm() {
  const [lang, setLang] = useState<AuthLang>("EN");
  const t = authDictionary[lang];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAction(email, password);
      if (result && !result.success) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-lg shadow-black/5">
      <LanguageToggle value={lang} onChange={setLang} />

      <h1 className="mb-1 text-xl font-semibold text-neutral-900">{t.loginTitle}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t.loginSubtitle}</p>

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700">
              {t.password}
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand-primary hover:underline">
              {t.forgotPassword}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder="********"
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
          {isPending ? t.signingIn : t.signIn}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {t.noAccount}{" "}
        <Link href="/register" className="font-medium text-brand-primary hover:underline">
          {t.createOne}
        </Link>
      </p>
    </div>
  );
}
