"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { registerAction } from "@/app/(auth)/register/_action";
import { authDictionary, type AuthLang } from "@/lib/authI18n";
import { LanguageToggle } from "./LanguageToggle";

const BD_PHONE_REGEX = /^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/;
const PASSWORD_LETTER_NUMBER_REGEX = /(?=.*[A-Za-z])(?=.*\d)/;

export function RegisterForm() {
  const [lang, setLang] = useState<AuthLang>("EN");
  const t = authDictionary[lang];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    if (!PASSWORD_LETTER_NUMBER_REGEX.test(password)) {
      setError(t.passwordNeedsLetterNumber);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordsDontMatch);
      return;
    }
    if (phone.trim() && !BD_PHONE_REGEX.test(phone.trim())) {
      setError(lang === "EN" ? "Phone must be a valid Bangladeshi number (e.g. 01XXXXXXXXX)" : "ফোন নম্বরটি সঠিক বাংলাদেশি ফরম্যাটে হতে হবে (যেমন 01XXXXXXXXX)");
      return;
    }

    startTransition(async () => {
      const result = await registerAction({
        name,
        email,
        password,
        phone: phone.trim() || undefined,
        preferredLanguage: lang,
      });
      if (result && !result.success) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg shadow-black/5">
      <LanguageToggle value={lang} onChange={setLang} />

      <h1 className="mb-1 text-xl font-semibold text-neutral-900">{t.registerTitle}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t.registerSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-neutral-700">
            {t.name}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder={t.namePlaceholder}
          />
        </div>

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
          <label htmlFor="phone" className="text-sm font-medium text-neutral-700">
            {t.phone}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder={t.phonePlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-neutral-700">
            {t.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder={t.passwordPlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">
            {t.confirmPassword}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
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
          {isPending ? t.creatingAccount : t.createAccount}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {t.haveAccount}{" "}
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          {t.signInInstead}
        </Link>
      </p>
    </div>
  );
}
