"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

const NavbarGreeting = ({ name }: { name: string }) => {
  const { translate } = useLocale();

  return (
    <p className="hidden truncate text-sm text-muted-foreground md:block">
      {translate("Welcome back,")} <span className="font-medium text-foreground">{name}</span>
    </p>
  );
};

export default NavbarGreeting;
