"use client";

import { Info, Megaphone, TriangleAlert, Wrench, X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import Banner from "@/components/smartly/Banner";
import type { AnnouncementType, CustomerAnnouncement } from "@/lib/customer/platform";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Which announcements this browser has closed -- a per-viewer convenience,
// so it lives in localStorage; a new announcement (new id) shows again.
const STORAGE_KEY = "dismissed-announcements";
const CHANGE_EVENT = "app:announcements";

const readDismissed = (): string => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};

const STYLE: Record<AnnouncementType, { tone: "info" | "warning" | "mint" | "danger"; Icon: typeof Info }> = {
  INFO: { tone: "info", Icon: Info },
  WARNING: { tone: "warning", Icon: TriangleAlert },
  PROMOTION: { tone: "mint", Icon: Megaphone },
  MAINTENANCE: { tone: "danger", Icon: Wrench },
};

// The admin's announcements (Admin > Content > Announcements) that are live
// for this customer, above every page, each one closable.
export function AnnouncementBanner({ announcements }: { announcements: CustomerAnnouncement[] }) {
  const { locale, t } = useLocale();
  // The server can't see localStorage, so it (and hydration) show them all;
  // the closed ones drop out right after.
  const dismissedRaw = useSyncExternalStore(subscribe, readDismissed, () => "");
  const dismissed = new Set(dismissedRaw.split(",").filter(Boolean));

  const dismiss = useCallback((id: string) => {
    const next = [...new Set([...readDismissed().split(",").filter(Boolean), id])].join(",");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-8">
      {visible.map((a) => {
        const { tone, Icon } = STYLE[a.type] ?? STYLE.INFO;
        const title = locale === "bn" && a.titleBn ? a.titleBn : a.title;
        const body = locale === "bn" && a.bodyBn ? a.bodyBn : a.body;
        return (
          <Banner key={a.id} tone={tone} inline icon={<Icon />} className="pr-2">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 font-normal whitespace-pre-line opacity-90">{body}</p>
              </div>
              <button type="button" onClick={() => dismiss(a.id)} title={t("Close")} aria-label={t("Close")} className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-sm opacity-70 hover:opacity-100">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </Banner>
        );
      })}
    </div>
  );
}
