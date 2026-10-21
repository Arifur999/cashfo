"use client";

import { useRef, useState } from "react";

// The menus a whole phone row opens. Radix opens a menu on pointerdown, so a
// finger that landed on a row to scroll the page popped the (modal) menu and
// the scroll stopped. Here a touch or a pen opens it on the tap, the click a
// scroll never fires, as Radix's own Select does; a mouse keeps Radix's
// press, and Enter and Space its keys. One row's menu is open at a time.
export function useRowMenus() {
  const [openId, setOpenId] = useState<string | null>(null);
  // What pressed the row, until its click. A click with no press before it
  // (a screen reader's) opens the menu too.
  const pressedBy = useRef<string | null>(null);

  return (id: string) => ({
    // For the row's DropdownMenu.
    root: {
      open: openId === id,
      onOpenChange: (next: boolean) => setOpenId((current) => (next ? id : current === id ? null : current)),
    },
    // For its DropdownMenuTrigger.
    trigger: {
      onPointerDown: (event: React.PointerEvent) => {
        pressedBy.current = event.pointerType;
        // Radix skips its own toggle on a press that is prevented.
        if (event.pointerType !== "mouse") event.preventDefault();
      },
      onClick: () => {
        const mouse = pressedBy.current === "mouse";
        pressedBy.current = null;
        if (!mouse) setOpenId(id);
      },
    },
  });
}
