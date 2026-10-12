import Link from "next/link";
import BrandMark from "@/components/modules/Auth/BrandMark";
import LocaleToggle from "@/components/shared/LocaleToggle";
import UserMenu from "@/components/shared/UserMenu";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";

interface CustomerTopBarProps {
  name: string;
  email: string;
}

const CustomerTopBar = ({ name, email }: CustomerTopBarProps) => (
  <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
      <Link href={CUSTOMER_HOME_ROUTE} className="rounded-xl">
        <BrandMark />
      </Link>
      <div className="flex items-center gap-2">
        <LocaleToggle />
        <UserMenu name={name} email={email} />
      </div>
    </div>
  </header>
);

export default CustomerTopBar;
