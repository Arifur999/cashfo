"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { NavSection } from "@/lib/navItem";
import SidebarBrand from "./SidebarBrand";
import SidebarNav from "./SidebarNav";

// Below `lg` the sidebar collapses into this drawer.
const MobileNav = ({ sections }: { sections: NavSection[] }) => {
  const [open, setOpen] = useState(false);
  const { translate } = useLocale();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={translate("Open navigation")}>
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 border-none bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="sr-only">
          <SheetTitle>{translate("Main navigation")}</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <SidebarBrand onNavigate={close} />
          <SidebarNav sections={sections} onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
