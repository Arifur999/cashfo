"use client";

import { Info, Megaphone, TriangleAlert, Wrench, X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
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

const STYLE: Record<AnnouncementType, { box: string; Icon: typeof Info }> = {
  INFO: { box: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100", Icon: Info },
  WARNING: { box: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100", Icon: TriangleAlert },
  PROMOTION: { box: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100", Icon: Megaphone },
  MAINTENANCE: { box: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100", Icon: Wrench },
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
    <div className="space-y-2 px-4 pt-4 sm:px-6">
      {visible.map((a) => {
        const { box, Icon } = STYLE[a.type] ?? STYLE.INFO;
        const title = locale === "bn" && a.titleBn ? a.titleBn : a.title;
        const body = locale === "bn" && a.bodyBn ? a.bodyBn : a.body;
        return (
          <div key={a.id} role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${box}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{title}</p>
              <p className="mt-0.5 whitespace-pre-line opacity-90">{body}</p>
            </div>
            <button type="button" onClick={() => dismiss(a.id)} title={t("Close")} aria-label={t("Close")} className="rounded-md p-1 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
