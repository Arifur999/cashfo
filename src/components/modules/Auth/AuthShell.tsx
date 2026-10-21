"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LegalLinks from "@/components/modules/Legal/LegalLinks";
import LocalePill from "@/components/shared/LocalePill";
import Logo from "@/components/smartly/Logo";
import { LOGIN_ROUTE, REGISTER_ROUTE, SESSION_EXPIRED_REASON } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AuthHero, AuthHeroCard, type AuthHeroVariant } from "./AuthHero";
import MaintenanceNotice, { MaintenanceContext, type MaintenanceState } from "./MaintenanceNotice";

// Which hero sits on the left: the sample cards for sign-in, the four
// feature cards for sign-up, the short list for the rest (a session that
// ended included).
const heroFor = (pathname: string, reason: string | null): AuthHeroVariant => {
  if (pathname === LOGIN_ROUTE) return reason === SESSION_EXPIRED_REASON ? "narrow" : "login";
  return pathname === REGISTER_ROUTE ? "register" : "narrow";
};

interface AuthShellProps {
  // Maintenance mode as Admin > Settings has it, for the notice above the
  // form and for any form it closes (sign-up). A promise, so the sign-in
  // and password forms paint at once and a slow API only holds back what
  // depends on it.
  maintenance: Promise<MaintenanceState>;
  children: React.ReactNode;
}

// The frame every sign-in page shares, drawn once by the (auth) layout so
// moving between sign-in, sign-up and the password pages swaps only the form
// column: the forest hero on wide screens (760px for sign-in and sign-up,
// 640px otherwise), and a column with the language pill, the page's form,
// and the legal links. Phones get the logo and the pill in a header;
// sign-in adds a small hero card under it (the phone sign-up board goes
// straight to its heading, closer and tighter).
const AuthShell = ({ maintenance, children }: AuthShellProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const hero = heroFor(pathname, searchParams.get("reason"));

  return (
    <div className={cn("group/auth grid min-h-screen bg-surface", hero === "narrow" ? "lg:grid-cols-[minmax(0,44%)_minmax(0,1fr)] xl:grid-cols-[640px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,52%)_minmax(0,1fr)] xl:grid-cols-[760px_minmax(0,1fr)]")}>
      <AuthHero variant={hero} />
      <div className="relative flex min-h-screen min-w-0 flex-col">
        <header className="flex items-center justify-between px-5 py-4 lg:absolute lg:top-8 lg:right-10 lg:p-0">
          <Link href="/" aria-label={t("{brand} home", { brand: BRAND_NAME })} className="rounded-md lg:hidden">
            <Logo height={38} alt="" />
          </Link>
          <LocalePill fullNames />
        </header>
        {hero === "login" && <AuthHeroCard />}
        {/* id + tabIndex give the root layout's skip link a focus target. */}
        <main id="main-content" tabIndex={-1} className={cn("flex flex-1 items-start justify-center px-5 pb-12 outline-none md:items-center lg:px-12 lg:pt-24", hero === "register" ? "pt-4 md:pt-8" : "pt-8")}>
          <div className={cn("flex w-full flex-col", hero === "narrow" ? "max-w-105" : "max-w-100", hero === "register" ? "gap-6 md:gap-8" : "gap-8")}>
            {/* One read for the notice and the form, so they always agree. */}
            <MaintenanceContext value={maintenance}>
              <Suspense fallback={null}>
                <MaintenanceNotice />
              </Suspense>
              {children}
            </MaintenanceContext>
          </div>
        </main>
        <footer className="px-5 pb-6 lg:px-12">
          {/* A new tab, so reading the terms doesn't throw away a half-typed form. */}
          <LegalLinks newTab />
        </footer>
      </div>
    </div>
  );
};

export default AuthShell;
