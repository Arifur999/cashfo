"use client";

import { BookText, House, LayoutGrid, Lock, Plus, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import StatePanel from "@/components/smartly/StatePanel";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { chooseWorkspaceHref } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useWorkspaceSwitch } from "./useWorkspaceSwitch";

// More than this and the rest are a click away in the chooser.
const MAX_SHOWN = 3;

// A label too long for a phone's row (a long business name, or the longer
// Bangla on a small phone) wraps onto another line rather than pushing the
// page sideways. Truncating can't help here: StatePanel's action row is as
// wide as its widest button, so a button has to be able to get narrower
// than its label.
const FITS = "h-auto min-h-10 max-w-full py-1.5 whitespace-normal";

// What a Books page shows outside a business workspace (see
// lib/customer/requireBusinessWorkspace.tsx): where Books live, a button
// that opens each business workspace right here, and the way to make one.
export function BooksWorkspaceNotice() {
  const { t } = useLocale();
  const pathname = usePathname();
  const switcher = useWorkspaceSwitch({ land: "stay" });
  const businesses = switcher.workspaces.filter((business) => business.type === "BUSINESS");
  const shown = businesses.slice(0, MAX_SHOWN);

  return (
    <PageFrame>
      <StatePanel
        icon={<BookText />}
        tone="neutral"
        title={t("Books live in a business workspace")}
        description={t("Accounts, customers and suppliers, receivables and payables and journal entries are kept in a business workspace, apart from your personal money.")}
        className="py-12"
        action={
          <>
            {shown.map((business, index) => {
              const pending = business.id === switcher.pendingId;
              return (
                <Button key={business.id} variant={index === 0 ? "primary" : "secondary"} disabled={switcher.busy} onClick={() => switcher.choose(business)} className={FITS}>
                  {pending ? <Loader size={16} onDark={index === 0} label={t("Loading...")} /> : switcher.isLocked(business) ? <Lock aria-hidden="true" /> : <Store aria-hidden="true" />}
                  {/* A name with no spaces breaks anywhere. */}
                  <span className="min-w-0 wrap-anywhere">{t("Open {name}", { name: switcher.nameOf(business) })}</span>
                </Button>
              );
            })}
            {businesses.length > shown.length && (
              <Button asChild variant="secondary" className={FITS}>
                <Link href={chooseWorkspaceHref(pathname)}>
                  <LayoutGrid aria-hidden="true" />
                  {t("See all workspaces")}
                </Link>
              </Button>
            )}
            <Button asChild variant={businesses.length > 0 ? "secondary" : "primary"} className={FITS}>
              <Link href="/settings/workspaces">
                <Plus aria-hidden="true" />
                {t("Create a business workspace")}
              </Link>
            </Button>
            <Button asChild variant="ghost" className={FITS}>
              <Link href={CUSTOMER_HOME_ROUTE}>
                <House aria-hidden="true" />
                {t("Go home")}
              </Link>
            </Button>
          </>
        }
      />
      {switcher.pinPrompt}
    </PageFrame>
  );
}
