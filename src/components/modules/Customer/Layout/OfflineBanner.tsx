"use client";

import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import Banner from "@/components/smartly/Banner";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

// The strip across the top of the page while the device is offline, as the
// states board draws it: the page keeps showing what it last loaded, and
// saving waits for the internet to come back.
export function OfflineBanner() {
  const { t } = useLocale();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const pathname = usePathname();
  // When the page on screen was loaded: reset by each page opened online.
  const [loaded, setLoaded] = useState(() => ({ pathname, at: new Date() }));
  if (online && loaded.pathname !== pathname) {
    setLoaded({ pathname, at: new Date() });
  }

  if (online) return null;
  return (
    <Banner tone="warning" icon={<WifiOff />}>
      {t("You are offline. Showing what was loaded at {time}; changes are paused.", { time: formatDate(loaded.at, "h:mm aaa") })}
    </Banner>
  );
}
