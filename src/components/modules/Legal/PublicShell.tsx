import Link from "next/link";
import LocalePill from "@/components/shared/LocalePill";
import Button from "@/components/smartly/Button";
import Logo from "@/components/smartly/Logo";
import { LOGIN_ROUTE, REGISTER_ROUTE } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/brand";
import { getLegalDocument } from "@/lib/customer/platform";
import { getTranslator } from "@/lib/i18n/locale";
import { getAccessToken } from "@/lib/tokenUtils";
import LegalNav from "./LegalNav";
import { LEGAL_PAGES, type LegalVersions } from "./legalPages";

// The policies' versions for the side menu ("v3"). The open page's own read
// of its document is shared (getLegalDocument is cached per request).
async function policyVersions(): Promise<LegalVersions> {
  const policies = LEGAL_PAGES.filter((entry) => entry.versioned);
  const docs = await Promise.all(policies.map((entry) => getLegalDocument(entry.page)));
  return Object.fromEntries(policies.flatMap((entry, index) => (docs[index] ? [[entry.page, docs[index].version]] : [])));
}

// 44px to tap on a phone, the board's 40px from md up.
const HEADER_BUTTON = "max-md:h-11";

// The frame of the legal pages, which anyone can open: the logo, the
// language pill and the way in (or back into the app), the side menu, the
// page, and its "On this page" list on a wide screen. No footer: the side
// menu already links every legal page. A phone header has room for the
// mark and one button: Sign in, for the customer who came back to read the
// FAQ (sign-in links on to sign-up).
const PublicShell = async ({ children }: { children: React.ReactNode }) => {
  const [{ t }, signedIn, versions] = await Promise.all([getTranslator(), getAccessToken().then(Boolean), policyVersions()]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-18 shrink-0 items-center gap-3 border-b border-line px-5 md:gap-6 md:px-12">
        <Link href="/" aria-label={t("{brand} home", { brand: BRAND_NAME })} className="min-w-0 rounded-md">
          <Logo variant="mark" height={32} alt="" className="sm:hidden" />
          <Logo height={36} alt="" className="hidden sm:block" />
        </Link>
        <span className="flex-1" />
        <LocalePill fullNames />
        {signedIn ? (
          <Button asChild className={HEADER_BUTTON}>
            <Link href="/">{t("Open the app")}</Link>
          </Button>
        ) : (
          <>
            <Button variant="secondary" asChild className={HEADER_BUTTON}>
              <Link href={LOGIN_ROUTE}>{t("Sign in")}</Link>
            </Button>
            <Button asChild className={`${HEADER_BUTTON} hidden sm:inline-flex`}>
              <Link href={REGISTER_ROUTE}>{t("Create an account")}</Link>
            </Button>
          </>
        )}
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="grid flex-1 content-start justify-center gap-8 px-5 py-8 outline-none md:px-12 md:py-12 lg:grid-cols-[240px_minmax(0,680px)] lg:gap-14 xl:grid-cols-[240px_minmax(0,680px)_200px]"
      >
        <LegalNav versions={versions} />
        {children}
      </main>
    </div>
  );
};

export default PublicShell;
