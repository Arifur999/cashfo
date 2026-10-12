"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SidebarContent } from "./Sidebar";

// Below \`lg\` the sidebar lives in this drawer, opened from the top bar.
export function MobileSidebar() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("Open navigation")}
          className="rounded-xl p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 border-none bg-brand-dark p-0 text-white">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("Main navigation")}</SheetTitle>
        </SheetHeader>
        {/* Following a link closes the drawer; the group headings are
            buttons and keep it open. */}
        <div
          className="flex h-full flex-col overflow-hidden"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setOpen(false);
            }
          }}
        >
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
