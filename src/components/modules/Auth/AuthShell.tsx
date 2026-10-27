"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import LegalLinks from "@/components/modules/Legal/LegalLinks";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import Logo from "@/components/smartly/Logo";
import { REGISTER_ROUTE } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import AuthHeroPanel, { APP_GRADIENT_PHONE, type AuthVariant } from "./AuthHeroPanel";
import MaintenanceNotice, { MaintenanceContext, type MaintenanceState } from "./MaintenanceNotice";

// Which frame a page gets: the admin panel's for its invite and reset pages,
// Register's for signing up, Main's for signing in and everything else.
const variantFor = (pathname: string): AuthVariant => {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return pathname === REGISTER_ROUTE ? "register" : "login";
};

// English | বাংলা on the app's pages (Main, LoginMobile): a sunken track
// with a white thumb, 32px segments wide and 36px ones on a phone.
const LocaleSwitch = () => {
  const { locale, toggleLocale, t } = useLocale();
  const choose = (next: Locale) => {
    if (next !== locale) toggleLocale();
  };
  return (
    <SegmentedControl
      options={[
        { value: "en" as const, label: <><span className="lg:hidden">EN</span><span className="hidden lg:inline">English</span></> },
        { value: "bn" as const, lang: "bn", label: <><span className="lg:hidden">বাং</span><span className="hidden lg:inline">বাংলা</span></> },
      ]}
      value={locale}
      onChange={choose}
      label={t("Language")}
      variant="pill"
      className="p-0.75 lg:p-1 [&>button]:h-9 [&>button]:min-w-11 [&>button]:px-3 lg:[&>button]:h-8 lg:[&>button]:px-3.5"
    />
  );
};

// The admin pages' one button (AdminLogin): the other language, by name.
const LocaleButton = () => {
  const { locale, toggleLocale, t } = useLocale();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t(locale === "bn" ? "Switch language to English" : "Switch language to Bangla")}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-body font-medium whitespace-nowrap text-ink-2 hover:bg-surface-sunken"
    >
      <Languages className="size-4" aria-hidden="true" />
      {locale === "bn" ? "English" : <span lang="bn">বাংলা</span>}
    </button>
  );
};

// LoginMobile's banner over the form: the line from the wide panel, and
// four pairs of bars.
const PhoneBanner = () => {
  const { t } = useLocale();
  return (
    <div className="px-5 pt-1.5 lg:hidden">
      <div className="relative mx-auto flex max-w-100 items-end justify-between gap-4 overflow-hidden rounded-2xl p-5 text-white" style={{ background: APP_GRADIENT_PHONE }}>
        <span aria-hidden="true" className="absolute -top-17.5 -right-15 size-45 rounded-full border border-white/14" />
        <div className="relative flex max-w-47.5 flex-col gap-1.5">
          <p className="text-[19px] leading-[1.25] font-bold tracking-[-0.01em]">{t("Every taka, clearly accounted for.")}</p>
          <p className="text-small leading-[1.45] text-white/84">{t("Income, expenses, savings and loans in one place.")}</p>
        </div>
        <div aria-hidden="true" className="relative flex h-18 items-end gap-1.5">
          {[
            [38, 26],
            [50, 30],
            [44, 34],
            [66, 32],
          ].map(([income, expense], index) => (
            <div key={index} className="flex items-end gap-0.75">
              <span className="w-1.75 rounded-t-[3px] bg-white" style={{ height: income }} />
              <span className="w-1.75 rounded-t-[3px] bg-white/45" style={{ height: expense }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface AuthShellProps {
  // Maintenance mode as Admin > Settings has it, for the notice above the
  // form and for any form it closes (sign-up). A promise, so the sign-in
  // and password forms paint at once and a slow API only holds back what
  // depends on it.
  maintenance: Promise<MaintenanceState>;
  children: React.ReactNode;
}

// The frame every sign-in page shares (design-v4 Main, Register, LoginMobile,
// RegisterMobile, and AdminLogin for the admin pages), drawn once by the
// (auth) layout so moving between them swaps only the form column: the
// gradient panel on the left from lg, the language switch at the top right,
// and the form column centred in the rest. Phones get a header with the
// logo and the switch instead, and the sign-in pages a small banner.
const AuthShell = ({ maintenance, children }: AuthShellProps) => {
  const pathname = usePathname();
  const { t } = useLocale();
  const variant = variantFor(pathname);
  const admin = variant === "admin";

  return (
    <div className={cn("min-h-dvh lg:grid", admin ? "bg-strip lg:grid-cols-[minmax(0,7fr)_minmax(0,11fr)]" : "bg-surface lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]")}>
      <AuthHeroPanel variant={variant} />

      <div className="relative flex min-h-dvh min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-3.5 lg:hidden">
          <Link href="/" aria-label={t("{brand} home", { brand: BRAND_NAME })} className="flex items-center gap-2.5 rounded-md">
            <Logo variant="icon" height={32} alt="" className="rounded-lg" />
            <span className="flex flex-col">
              <span className="text-title tracking-[-0.01em] text-ink">{BRAND_NAME}</span>
              {admin && <span className="text-caption text-ink-muted">{t("Admin panel")}</span>}
            </span>
          </Link>
          {admin ? <LocaleButton /> : <LocaleSwitch />}
        </header>
        <div className={cn("absolute hidden lg:block", admin ? "top-6 right-7" : "top-8 right-10")}>{admin ? <LocaleButton /> : <LocaleSwitch />}</div>

        {variant === "login" && <PhoneBanner />}

        {/* id + tabIndex give the root layout's skip link a focus target. */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn("flex flex-1 flex-col px-5 outline-none lg:items-center lg:justify-center lg:px-12", variant === "register" ? "pt-4 pb-7 lg:py-12" : "pt-7 pb-8 lg:py-12")}
        >
          <div className={cn("mx-auto flex w-full flex-1 flex-col lg:flex-none", admin ? "max-w-105 gap-5.5" : "max-w-100 gap-7 lg:gap-8", variant === "register" && "gap-6 lg:gap-7")}>
            {/* One read for the notice and the form, so they always agree. */}
            <MaintenanceContext value={maintenance}>
              <Suspense fallback={null}>
                <MaintenanceNotice />
              </Suspense>
              {children}
            </MaintenanceContext>
          </div>
        </main>

        <footer className="px-5 pb-3">
          {/* A new tab, so reading the terms doesn't throw away a half-typed form. */}
          <LegalLinks newTab className="mx-auto max-w-110" />
        </footer>
      </div>
    </div>
  );
};

export default AuthShell;
