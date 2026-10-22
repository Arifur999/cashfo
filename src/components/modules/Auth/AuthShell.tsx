"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import LegalLinks from "@/components/modules/Legal/LegalLinks";
import LocalePill from "@/components/shared/LocalePill";
import Logo from "@/components/smartly/Logo";
import { LOGIN_ROUTE, REGISTER_ROUTE } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AuthPhoto, type AuthPhotoVariant } from "./AuthPhoto";
import MaintenanceNotice, { MaintenanceContext, type MaintenanceState } from "./MaintenanceNotice";

// Which photo sits beside the form: the sunlit seedling for signing in and
// the password pages, the seedling in open hands for signing up.
const photoFor = (pathname: string): AuthPhotoVariant => {
  if (pathname === LOGIN_ROUTE) return "login";
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
// column: a soft mint-green ground with slow drifting lights, and one card that
// rises in -- the page's photo on one side (a banner on phones), and the
// logo, language pill, form and legal links on the other, the form's parts
// arriving one after another.
const AuthShell = ({ maintenance, children }: AuthShellProps) => {
  const pathname = usePathname();
  const { t } = useLocale();
  const photo = photoFor(pathname);
  // Sign-up sets two fields to a row, so its column is a little wider.
  const width = photo === "register" ? "max-w-110" : "max-w-100";

  return (
    <div className="auth-backdrop relative min-h-dvh overflow-hidden">
      <span aria-hidden="true" className="auth-light -top-24 -left-24 size-120 bg-mint-200/70" />
      <span aria-hidden="true" className="auth-light top-1/3 -right-32 size-130 bg-mint-200" style={{ animationDelay: "-8s", animationDuration: "32s" }} />
      <span aria-hidden="true" className="auth-light -bottom-40 left-1/4 size-110 bg-emerald/25" style={{ animationDelay: "-15s", animationDuration: "38s" }} />

      <div className="relative flex min-h-dvh items-center justify-center px-3 py-4 sm:px-6 md:py-8 lg:px-8 lg:py-10">
        <div className="auth-card grid w-full max-w-270 overflow-hidden rounded-[28px] bg-surface shadow-overlay ring-1 ring-white/70 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
          <AuthPhoto variant={photo} />

          <div className="flex min-w-0 flex-col px-5 pt-4 pb-5 sm:px-8 lg:px-10 lg:pt-6 lg:pb-5 xl:px-14">
            {/* As wide as the form, so the logo lines up with its left edge. */}
            <header className={cn("mx-auto flex w-full items-center justify-between gap-4", width)}>
              <Link href="/" aria-label={t("{brand} home", { brand: BRAND_NAME })} className="rounded-md">
                <Logo height={36} alt="" />
              </Link>
              <LocalePill fullNames />
            </header>

            {/* id + tabIndex give the root layout's skip link a focus target. */}
            <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center py-6 outline-none">
              <div className={cn("auth-stagger flex w-full flex-col gap-5", width)}>
                {/* One read for the notice and the form, so they always agree. */}
                <MaintenanceContext value={maintenance}>
                  <Suspense fallback={null}>
                    <MaintenanceNotice />
                  </Suspense>
                  {children}
                </MaintenanceContext>
              </div>
            </main>

            {/* A little wider than sign-in's form, so the four links keep one line. */}
            <footer className="mx-auto w-full max-w-110">
              {/* A new tab, so reading the terms doesn't throw away a half-typed form. */}
              <LegalLinks newTab />
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
