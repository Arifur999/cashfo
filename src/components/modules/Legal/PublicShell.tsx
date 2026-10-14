import Link from "next/link";
import LocalePill from "@/components/shared/LocalePill";
import Button from "@/components/smartly/Button";
import Logo from "@/components/smartly/Logo";
import { LOGIN_ROUTE, REGISTER_ROUTE } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/brand";
import { getTranslator } from "@/lib/i18n/locale";
import { getAccessToken } from "@/lib/tokenUtils";
import LegalLinks from "./LegalLinks";
import LegalNav from "./LegalNav";

// The frame of the legal pages, which anyone can open: the logo, the
// language pill and the way in (or back into the app), the side menu, the
// page, and the legal links at the foot.
const PublicShell = async ({ children }: { children: React.ReactNode }) => {
  const [{ t }, signedIn] = await Promise.all([getTranslator(), getAccessToken().then(Boolean)]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-18 shrink-0 items-center gap-3 border-b border-line px-5 md:gap-6 md:px-12">
        <Link href="/" aria-label={`${BRAND_NAME} home`} className="rounded-md">
          <Logo height={36} alt="" />
        </Link>
        <span className="flex-1" />
        <LocalePill />
        {signedIn ? (
          <Button asChild>
            <Link href="/">{t("Open the app")}</Link>
          </Button>
        ) : (
          <>
            <Button variant="secondary" asChild className="hidden sm:inline-flex">
              <Link href={LOGIN_ROUTE}>{t("Sign in")}</Link>
            </Button>
            <Button asChild>
              <Link href={REGISTER_ROUTE}>{t("Create an account")}</Link>
            </Button>
          </>
        )}
      </header>
      <main id="main-content" tabIndex={-1} className="grid flex-1 justify-center gap-8 px-5 py-8 outline-none md:px-12 md:py-12 lg:grid-cols-[240px_minmax(0,680px)] lg:gap-14">
        <LegalNav />
        <div className="min-w-0">{children}</div>
      </main>
      <footer className="border-t border-line px-5 py-6 md:px-12">
        <LegalLinks />
      </footer>
    </div>
  );
};

export default PublicShell;
