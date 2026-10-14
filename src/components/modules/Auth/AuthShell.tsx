import Link from "next/link";
import LocaleToggle from "@/components/shared/LocaleToggle";
import LegalLinks from "@/components/modules/Legal/LegalLinks";
import { BRAND_NAME } from "@/lib/brand";
import Logo from "@/components/smartly/Logo";
import AuthBrandPanel from "./AuthBrandPanel";

// The frame every sign-in page shares: the brand panel on wide screens, and
// a column with the logo (small screens only -- the panel shows it on wide
// ones), the language switch, the page's form, and the legal links.
// `notice` (the maintenance notice) sits above the form.
const AuthShell = ({ children, notice }: { children: React.ReactNode; notice?: React.ReactNode }) => (
  <div className="grid min-h-screen bg-background lg:grid-cols-2 xl:grid-cols-[5fr_6fr]">
    <AuthBrandPanel />
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:justify-end">
        <Link href="/" aria-label={`${BRAND_NAME} home`} className="rounded-md lg:hidden">
          <Logo height={38} alt="" />
        </Link>
        <LocaleToggle />
      </header>
      {/* id + tabIndex give the root layout's skip link a focus target. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 pt-4 pb-16 outline-none sm:px-8">
        <div className="w-full max-w-[400px] space-y-6">
          {notice}
          {children}
        </div>
      </main>
      <footer className="px-4 pb-6 sm:px-8">
        <LegalLinks />
      </footer>
    </div>
  </div>
);

export default AuthShell;
