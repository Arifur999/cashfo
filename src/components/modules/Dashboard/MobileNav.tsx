"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { NavSection } from "@/lib/navItem";
import type { IAdminUser } from "@/types/auth.types";
import SidebarBrand from "./SidebarBrand";
import SidebarFoot from "./SidebarFoot";
import SidebarNav from "./SidebarNav";

// Below `lg` the Night sidebar slides in from the left.
const MobileNav = ({ sections, admin }: { sections: NavSection[]; admin: IAdminUser }) => {
  const [open, setOpen] = useState(false);
  const { translate } = useLocale();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" aria-label={translate("Open navigation")} className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink lg:hidden">
          <Menu className="size-5.5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} className="w-79 max-w-[85vw] gap-0 border-none bg-night-panel p-0 text-white shadow-[28px_0_60px_-16px_rgba(0,0,0,0.4)] sm:max-w-79">
        <SheetHeader className="sr-only">
          <SheetTitle>{translate("Main navigation")}</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col px-3 pt-4 pb-4">
          <div className="flex items-center justify-between">
            <SidebarBrand onNavigate={close} />
            <button type="button" onClick={close} aria-label={translate("Close menu")} className="mb-3 flex size-11 items-center justify-center rounded-md bg-white/8 text-white">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <SidebarNav sections={sections} role={admin.role} onNavigate={close} />
          <SidebarFoot admin={admin} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
