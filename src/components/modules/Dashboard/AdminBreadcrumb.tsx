"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { findAdminNavLocation, type NavSection } from "@/lib/navItem";

// Where the admin is: the group in muted text, then the page.
const AdminBreadcrumb = ({ sections }: { sections: NavSection[] }) => {
  const pathname = usePathname();
  const { translate } = useLocale();
  const location = findAdminNavLocation(pathname, sections);
  // A page outside the menu still says where you are.
  const ownPage = !location && pathname === "/admin/account" ? "My account" : null;

  return (
    <nav aria-label={translate("Breadcrumb")} className="flex min-w-0 flex-1 items-center gap-2 text-body text-ink-muted">
      {location && (
        <>
          <span className="hidden whitespace-nowrap sm:inline">{translate(location.section.title)}</span>
          <ChevronRight className="hidden size-3.5 shrink-0 text-line-strong sm:block" aria-hidden="true" />
          <span aria-current="page" className="truncate text-title text-ink">
            {translate(location.item.title)}
          </span>
        </>
      )}
      {ownPage && (
        <span aria-current="page" className="truncate text-title text-ink">
          {translate(ownPage)}
        </span>
      )}
    </nav>
  );
};

export default AdminBreadcrumb;
