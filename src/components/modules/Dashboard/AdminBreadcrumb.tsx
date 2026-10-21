"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { adminCrumb } from "@/lib/adminBreadcrumb";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { NavSection } from "@/lib/navItem";
import { useRecordTitle } from "./BreadcrumbTitle";

// Where the admin is, as the design's top bar says it: the parent in muted
// text, a chevron, then the page ("Security › Sign-ins", "Users › Sharmin
// Akter", "Nadia Rahman › My account"). The parent links back up when it is
// a page of its own; phones show the page alone.
const AdminBreadcrumb = ({ sections, adminName }: { sections: NavSection[]; adminName: string }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { translate } = useLocale();
  const recordTitle = useRecordTitle();
  const crumb = adminCrumb(pathname, { from: searchParams.get("from"), sections });

  if (!crumb) {
    return <div className="flex-1" />;
  }
  const parent = crumb.parent === null ? adminName : translate(crumb.parent);
  const page = crumb.record ? (crumb.page ?? recordTitle) : crumb.page && translate(crumb.page);

  return (
    <nav aria-label={translate("Breadcrumb")} className="flex min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-2 text-body text-ink-muted">
        <li className="hidden whitespace-nowrap sm:block">
          {crumb.parentHref ? (
            <Link href={crumb.parentHref} className="rounded-sm underline-offset-4 transition-colors hover:text-ink hover:underline">
              {parent}
            </Link>
          ) : (
            parent
          )}
        </li>
        {page && (
          <li className="flex min-w-0 items-center gap-2">
            <ChevronRight className="hidden size-3.5 shrink-0 text-line-strong sm:block" aria-hidden="true" />
            <span aria-current="page" className="truncate text-title text-ink">
              {page}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
};

export default AdminBreadcrumb;
