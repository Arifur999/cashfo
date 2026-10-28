"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import Banner from "@/components/smartly/Banner";
import type { CustomerAnnouncement } from "@/lib/customer/platform";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ANNOUNCEMENT_BANNER_STYLE } from "./announcementStyle";

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

// Only a page of this app or an https address is followed, whatever the API
// sends (it checks the same).
const IN_APP = /^\/(?!\/)\S*$/;
const HTTPS = /^https:\/\/\S+$/;

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
        // An unknown kind (a newer API) reads as Info.
        const { tone, Icon } = ANNOUNCEMENT_BANNER_STYLE[a.type] ?? ANNOUNCEMENT_BANNER_STYLE.INFO;
        const title = locale === "bn" && a.titleBn ? a.titleBn : a.title;
        const body = locale === "bn" && a.bodyBn ? a.bodyBn : a.body;
        return (
          <Banner key={a.id} tone={tone} inline icon={<Icon />} className="pr-2">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 font-normal whitespace-pre-line opacity-90">{body}</p>
                {a.linkUrl && IN_APP.test(a.linkUrl) && (
                  <Link href={a.linkUrl} className="mt-1 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                    {t("Try it")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
                {a.linkUrl && HTTPS.test(a.linkUrl) && (
                  <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                    {t("Try it")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </a>
                )}
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
