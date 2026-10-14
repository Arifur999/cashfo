import Link from "next/link";
import LegalLinks from "@/components/modules/Legal/LegalLinks";
import LocalePill from "@/components/shared/LocalePill";
import Logo from "@/components/smartly/Logo";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { AuthHero, AuthHeroCard, type AuthHeroVariant } from "./AuthHero";

interface AuthShellProps {
  // Which hero sits on the left: the sample cards for sign-in, the three
  // feature cards for sign-up, the short list for the rest.
  hero: AuthHeroVariant;
  // The maintenance notice, above the form.
  notice?: React.ReactNode;
  children: React.ReactNode;
}

// The frame every sign-in page shares: the aurora hero on wide screens
// (760px for sign-in and sign-up, 640px otherwise), and a column with the
// language pill, the page's form, and the legal links. Phones get the logo
// and the pill in a header, then a small hero card.
const AuthShell = ({ hero, notice, children }: AuthShellProps) => (
  <div className={cn("grid min-h-screen bg-surface", hero === "narrow" ? "lg:grid-cols-[minmax(0,44%)_minmax(0,1fr)] xl:grid-cols-[640px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,52%)_minmax(0,1fr)] xl:grid-cols-[760px_minmax(0,1fr)]")}>
    <AuthHero variant={hero} />
    <div className="relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 py-4 lg:absolute lg:top-8 lg:right-10 lg:p-0">
        <Link href="/" aria-label={`${BRAND_NAME} home`} className="rounded-md lg:hidden">
          <Logo height={38} alt="" />
        </Link>
        <LocalePill />
      </header>
      <AuthHeroCard />
      {/* id + tabIndex give the root layout's skip link a focus target. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-5 pt-8 pb-12 outline-none lg:px-12 lg:pt-24">
        <div className={cn("flex w-full flex-col gap-8", hero === "narrow" ? "max-w-105" : "max-w-100")}>
          {notice}
          {children}
        </div>
      </main>
      <footer className="px-5 pb-6 lg:px-12">
        <LegalLinks />
      </footer>
    </div>
  </div>
);

export default AuthShell;
