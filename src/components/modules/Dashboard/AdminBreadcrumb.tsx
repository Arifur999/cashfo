"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { adminCrumb, type AdminCrumb } from "@/lib/adminBreadcrumb";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { findAdminNavLocation, type NavSection } from "@/lib/navItem";
import { useRecordTitle } from "./BreadcrumbTitle";

// Where the admin is, as the design's top bar says it: the parent in muted
// text, a chevron, then the page ("Security › Sign-ins", "Users › Sharmin
// Akter", "Nadia Rahman › My account").
const AdminBreadcrumb = ({ sections, adminName }: { sections: NavSection[]; adminName: string }) => {
  const pathname = usePathname();
  const { translate } = useLocale();
  const recordTitle = useRecordTitle();
  // A page the table doesn't know still says where it is in the menu.
  const location = findAdminNavLocation(pathname, sections);
  const crumb: AdminCrumb | null = adminCrumb(pathname) ?? (location && { parent: location.section.title, page: location.item.title });

  if (!crumb) {
    return <div className="flex-1" />;
  }
  const parent = crumb.parent === null ? adminName : translate(crumb.parent);
  const page = crumb.record ? (crumb.page ?? recordTitle) : crumb.page && translate(crumb.page);

  return (
    <nav aria-label={translate("Breadcrumb")} className="flex min-w-0 flex-1 items-center gap-2 text-body text-ink-muted">
      <span className="hidden whitespace-nowrap sm:inline">{parent}</span>
      {page && (
        <>
          <ChevronRight className="hidden size-3.5 shrink-0 text-line-strong sm:block" aria-hidden="true" />
          <span aria-current="page" className="truncate text-title text-ink">
            {page}
          </span>
        </>
      )}
    </nav>
  );
};

export default AdminBreadcrumb;
