"use client";

import { useRef, type RefObject } from "react";

// Hands the focus back after a dialog that opens from state rather than a
// trigger of its own (the PIN prompt). Radix only gives it back to the
// dialog's own trigger, so without this Cancel or Esc leaves keyboard and
// screen-reader users on the page's body. remember() runs in the event
// that opens the dialog, while the control used still has the focus (the
// dialog's field takes it as it mounts). On close the focus goes back to
// that control, or to `fallbackRef` once it is gone (a menu item: the
// account menu closes for the dialog).
export function useReturnFocus(fallbackRef?: RefObject<HTMLElement | null>) {
  const openerRef = useRef<HTMLElement | null>(null);

  function remember() {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  // For the dialog content's onCloseAutoFocus.
  function onCloseAutoFocus(event: Event) {
    event.preventDefault();
    for (const element of [openerRef.current, fallbackRef?.current]) {
      if (!element?.isConnected || element === document.body) continue;
      element.focus();
      if (document.activeElement === element) return;
    }
  }

  return { remember, onCloseAutoFocus };
}
