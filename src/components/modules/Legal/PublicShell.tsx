import Link from "next/link";
import LocaleToggle from "@/components/shared/LocaleToggle";
import BrandMark from "@/components/modules/Auth/BrandMark";
import LegalLinks from "./LegalLinks";

// The frame for pages anyone can open without signing in -- the legal pages
// and the maintenance notice: the logo home, the language switch, the page,
// and the legal links at the foot.
const PublicShell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-background">
    <header className="flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-8">
      <Link href="/" className="rounded-xl">
        <BrandMark />
      </Link>
      <LocaleToggle />
    </header>
    <main id="main-content" tabIndex={-1} className="flex flex-1 justify-center px-4 py-10 outline-none sm:px-8">
      <div className="w-full max-w-3xl">{children}</div>
    </main>
    <footer className="border-t px-4 py-6 sm:px-8">
      <LegalLinks />
    </footer>
  </div>
);

export default PublicShell;
