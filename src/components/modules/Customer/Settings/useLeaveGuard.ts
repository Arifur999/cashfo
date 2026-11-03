"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// While `dirty`, a press on a link to another page of the app is held and
// `pending` names where it went, so the page can ask "Leave without
// saving?"; leave() goes there anyway, stay() forgets it. Closing or
// reloading the tab gets the browser's own warning. A link that opens a new
// tab, a download, a modified click, or one to this same page goes on.
export function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    // Caught before React's own handler (Next's Link) sees the click.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(`${url.pathname}${url.search}${url.hash}`);
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [dirty]);

  return {
    pending,
    stay: () => setPending(null),
    leave: () => {
      const href = pending;
      setPending(null);
      if (href) router.push(href);
    },
  };
}
