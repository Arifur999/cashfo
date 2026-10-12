import Link from "next/link";
import LocaleToggle from "@/components/shared/LocaleToggle";
import AuthBrandPanel from "./AuthBrandPanel";
import BrandMark from "./BrandMark";

// The frame every sign-in page shares: the brand panel on wide screens, and
// a column with the logo (small screens only -- the panel shows it on wide
// ones), the language switch and the page's form.
const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="grid min-h-screen bg-background lg:grid-cols-2 xl:grid-cols-[5fr_6fr]">
    <AuthBrandPanel />
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:justify-end">
        <Link href="/" className="rounded-xl lg:hidden">
          <BrandMark />
        </Link>
        <LocaleToggle />
      </header>
      {/* id + tabIndex give the root layout's skip link a focus target. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 pt-4 pb-16 outline-none sm:px-8">
        <div className="w-full max-w-[400px] space-y-6">{children}</div>
      </main>
    </div>
  </div>
);

export default AuthShell;
