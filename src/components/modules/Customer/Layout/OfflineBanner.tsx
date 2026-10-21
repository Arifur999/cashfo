"use client";

import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Banner from "@/components/smartly/Banner";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useOnline } from "./useOnline";

// The strip across the top of the page while the device is offline, as the
// states board draws it: the page keeps showing what it last loaded, and
// saving waits for the internet to come back (useOnline() holds a page's
// own Save buttons meanwhile).
export function OfflineBanner() {
  const { t } = useLocale();
  const online = useOnline();
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
