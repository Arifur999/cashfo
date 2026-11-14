import { CalendarDays, Cake, Gift, Heart, Moon, Star, Sun, type LucideIcon } from "lucide-react";
import { eventTypeMeta, type Tint } from "@/lib/customer/eventsDisplay";
import type { SocialEventType } from "@/lib/customer/eventsTypes";

// A tint's classes: the soft ground, its ink as text, and the ink as a fill
// (a calendar pill's dot).
export const TINT: Record<Tint, { bg: string; fg: string; dot: string }> = {
  pink: { bg: "bg-tint-pink", fg: "text-tint-pink-ink", dot: "bg-tint-pink-ink" },
  yellow: { bg: "bg-tint-yellow", fg: "text-tint-yellow-ink", dot: "bg-tint-yellow-ink" },
  teal: { bg: "bg-tint-teal", fg: "text-tint-teal-ink", dot: "bg-tint-teal-ink" },
  violet: { bg: "bg-tint-violet", fg: "text-tint-violet-ink", dot: "bg-tint-violet-ink" },
  orange: { bg: "bg-tint-orange", fg: "text-tint-orange-ink", dot: "bg-tint-orange-ink" },
  blue: { bg: "bg-tint-blue", fg: "text-tint-blue-ink", dot: "bg-tint-blue-ink" },
  green: { bg: "bg-tint-green", fg: "text-tint-green-ink", dot: "bg-tint-green-ink" },
  grey: { bg: "bg-surface-sunken", fg: "text-ink-soft", dot: "bg-ink-soft" },
};

const TYPE_ICON: Record<SocialEventType, LucideIcon> = {
  WEDDING: Heart,
  HOLUD: Sun,
  AQIQAH: Gift,
  KHATNA: Star,
  BIRTHDAY: Cake,
  MILAD: Moon,
  EID: Moon,
  OTHER: CalendarDays,
};

// The Events board's popup frame: 22px corners and a 38px filled close
// button on the page grey, so its head is 18px (20px with a lead) a side.
export const POPUP = {
  className: "rounded-[22px] leading-[normal]",
  closeClassName: "my-0 size-9.5 bg-page text-ink-2 hover:bg-surface-sunken",
};

// An event type's icon and colours.
export function typeLook(type: SocialEventType) {
  const meta = eventTypeMeta(type);
  return { ...meta, ...TINT[meta.tint], Icon: TYPE_ICON[type] };
}
