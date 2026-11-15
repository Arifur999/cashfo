"use client";

import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, HandCoins, Play, PiggyBank, Rocket, ShieldCheck, Users, Wallet, X } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { CATEGORY_LABEL, videoTitle, type HelpVideo, type VideoCategory } from "@/lib/customer/helpPage";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { YoutubeMark } from "./HelpCompanyCards";

// Each category's colour and picture, as the board draws the thumbnails.
const LOOK: Record<VideoCategory, { tile: string; Icon: typeof Rocket }> = {
  GETTING_STARTED: { tile: "bg-ai-hero", Icon: Rocket },
  INCOME_EXPENSE: { tile: "bg-tint-blue-ink", Icon: Wallet },
  SAVINGS: { tile: "bg-income", Icon: PiggyBank },
  LOANS: { tile: "bg-tint-orange-ink", Icon: HandCoins },
  GROUP_EXPENSE: { tile: "bg-tint-violet-ink", Icon: Users },
  SECURITY: { tile: "bg-ink-2", Icon: ShieldCheck },
  OTHER: { tile: "bg-ink-soft", Icon: BookOpen },
};

// The SettingsHelp board's Video guides: the categories to pick from and
// a card per guide; a card opens the player (HelpVideoPlayer board).
export function HelpVideos({ videos, all }: { videos: HelpVideo[]; all: HelpVideo[] }) {
  const { t, fmt, locale } = useLocale();
  const [category, setCategory] = useState<VideoCategory | "ALL">("ALL");
  const [playing, setPlaying] = useState<HelpVideo | null>(null);
  const bangla = locale === "bn";
  const used = (Object.keys(CATEGORY_LABEL) as VideoCategory[]).filter((key) => videos.some((video) => video.category === key));
  const shown = category === "ALL" ? videos : videos.filter((video) => video.category === category);
  const number = (video: HelpVideo) => all.findIndex((one) => one.id === video.id) + 1;
  const at = playing ? shown.findIndex((video) => video.id === playing.id) : -1;

  return (
    <section aria-labelledby="hp-vg" className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="hp-vg" className="text-[16px] font-semibold text-ink">
            {t("Video guides")}
          </h2>
          <p className="text-[13px] text-ink-muted">{t("Short videos that show each step.")}</p>
        </div>
        <span className="shrink-0 text-[12.5px] text-ink-muted">{t(videos.length === 1 ? "{count} video" : "{count} videos", { count: formatCount(videos.length, fmt) })}</span>
      </div>
      {videos.length > 0 && (
        <div role="group" aria-label={t("Video guides")} className="flex flex-wrap gap-2">
          {(["ALL", ...used] as const).map((key) => {
            const count = key === "ALL" ? videos.length : videos.filter((video) => video.category === key).length;
            const on = category === key;
            return (
              <button key={key} type="button" aria-pressed={on} onClick={() => setCategory(key)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px]", on ? "border-primary bg-primary font-semibold text-white" : "border-line bg-surface font-medium text-ink-2 hover:bg-soft-hover")}>
                {t(key === "ALL" ? "All" : CATEGORY_LABEL[key])}
                <span className={cn("text-[11.5px]", on ? "text-white/75" : "text-ink-faint")}>{formatCount(count, fmt)}</span>
              </button>
            );
          })}
        </div>
      )}
      {videos.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-line px-4 py-8 text-center text-small text-ink-muted">{t("No video guides here yet. Try the common questions, or send us a message.")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 @xl:grid-cols-3">
          {shown.map((video) => {
            const { tile, Icon } = LOOK[video.category] ?? LOOK.OTHER;
            return (
              <li key={video.id}>
                <button type="button" onClick={() => setPlaying(video)} className="group flex h-full w-full flex-col overflow-hidden rounded-[14px] border border-line bg-surface text-left hover:border-primary/40 hover:shadow-card">
                  <span className={cn("relative flex aspect-video w-full items-center justify-center overflow-hidden text-white", tile)}>
                    <span className="absolute top-2.5 left-3 text-[11.5px] font-semibold text-white/92">{t(CATEGORY_LABEL[video.category] ?? "Other")}</span>
                    <Icon className="absolute -right-3 -bottom-4 size-24 opacity-20" strokeWidth={1.5} aria-hidden="true" />
                    <span className="flex size-12 items-center justify-center rounded-full bg-white/95 text-primary shadow-md transition-transform group-hover:scale-105">
                      <Play className="ml-0.5 size-4.5 fill-current" aria-hidden="true" />
                    </span>
                    <span className="absolute right-2.5 bottom-2.5 rounded-[6px] bg-black/55 px-2 py-0.5 text-[11.5px] font-semibold">{t("{count} min", { count: formatCount(video.minutes, fmt) })}</span>
                  </span>
                  <span className="flex flex-1 flex-col gap-1 px-3.5 pt-3 pb-3.5">
                    <span className="line-clamp-2 min-h-[39px] text-body leading-[1.4] font-semibold text-ink">{videoTitle(video, bangla)}</span>
                    <span className="mt-auto text-[12.5px] text-ink-muted">{t("Guide {n} · {count} min", { n: formatCount(number(video), fmt), count: formatCount(video.minutes, fmt) })}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* The HelpVideoPlayer board: the guide's number and topic over its
          title, the round close, the video in a 14px frame and the controls
          under it on the dialog's own ground. */}
      <Dialog open={playing !== null} onOpenChange={(next) => !next && setPlaying(null)}>
        <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-48px)] w-205 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-y-auto rounded-[20px] border-0 bg-surface p-0 text-ink shadow-[0_24px_60px_rgba(18,32,29,0.32)] ring-0 sm:max-w-[calc(100vw-32px)]">
          {playing && (
            <>
              <div className="flex items-start gap-3 pt-4 pr-4 pb-3 pl-5.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                  <DialogDescription className="text-[12.5px] text-ink-muted">{t("Guide {n} · {category} · {count} min", { n: formatCount(number(playing), fmt), category: t(CATEGORY_LABEL[playing.category] ?? "Other"), count: formatCount(playing.minutes, fmt) })}</DialogDescription>
                  <DialogTitle className="text-[18px] leading-[1.35] font-bold text-ink">{videoTitle(playing, bangla)}</DialogTitle>
                </span>
                <button type="button" onClick={() => setPlaying(null)} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink-2 hover:bg-line">
                  <X className="size-4.5" aria-hidden="true" />
                </button>
              </div>
              <div className="px-5.5">
                <div className="aspect-video w-full overflow-hidden rounded-[14px] bg-black">
                  {/* youtube-nocookie: no tracking cookie until the person presses play. */}
                  <iframe key={playing.id} title={videoTitle(playing, bangla)} src={`https://www.youtube-nocookie.com/embed/${playing.youtubeId}?rel=0&modestbranding=1`} className="size-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 px-5.5 pt-3.5 pb-4.5">
                <Button asChild variant="secondary" className="h-9.5 gap-2 px-3.5 text-[13.5px]">
                  <a href={`https://www.youtube.com/watch?v=${playing.youtubeId}`} target="_blank" rel="noopener noreferrer">
                    <span className="[&_svg]:size-4">
                      <YoutubeMark />
                    </span>
                    {t("Open on YouTube")}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </Button>
                <span className="flex-1" />
                <span className="text-[12.5px] whitespace-nowrap text-ink-muted">{t("{n} of {count}", { n: formatCount(at + 1, fmt), count: formatCount(shown.length, fmt) })}</span>
                <Button variant="secondary" className="h-9.5 gap-1 pr-3.5 pl-2.5 text-[13.5px]" disabled={at <= 0} onClick={() => setPlaying(shown[at - 1])}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  {t("Previous")}
                </Button>
                <Button className="h-9.5 gap-1 pr-2.5 pl-3.5 text-[13.5px]" disabled={at < 0 || at >= shown.length - 1} onClick={() => setPlaying(shown[at + 1])}>
                  {t("Next")}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
