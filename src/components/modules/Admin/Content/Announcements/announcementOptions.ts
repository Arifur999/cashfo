import type { LucideIcon } from "lucide-react";
import { ANNOUNCEMENT_BANNER_STYLE } from "@/components/modules/Customer/Layout/announcementStyle";
import type { AnnouncementType } from "@/types/announcement.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { ALL_PLANS } from "@/zod/announcement.validation";
import { inEnglish, type Translate } from "@/lib/i18n/message";

type AnnouncementTone = "info" | "warning" | "mint" | "expense";

// Each kind of banner: its icon, taken from the app's own pairing
// (ANNOUNCEMENT_BANNER_STYLE, which the customer banner draws with), and
// the chip and icon-tile colour of its Banner tone, so the list's chip,
// the type picker and the preview read as the app draws it.
export const ANNOUNCEMENT_TYPE_META: Record<AnnouncementType, { label: string; icon: LucideIcon; tone: AnnouncementTone }> = {
  INFO: { label: "Info", icon: ANNOUNCEMENT_BANNER_STYLE.INFO.Icon, tone: "info" },
  WARNING: { label: "Warning", icon: ANNOUNCEMENT_BANNER_STYLE.WARNING.Icon, tone: "warning" },
  PROMOTION: { label: "Promotion", icon: ANNOUNCEMENT_BANNER_STYLE.PROMOTION.Icon, tone: "mint" },
  MAINTENANCE: { label: "Maintenance", icon: ANNOUNCEMENT_BANNER_STYLE.MAINTENANCE.Icon, tone: "expense" },
};

// The smartly Banner's tone for each kind, exactly as the app's banner has it.
export const bannerTone = (type: AnnouncementType) => ANNOUNCEMENT_BANNER_STYLE[type].tone;

// The round icon tile on the type picker's cards.
export const ICON_TILE: Record<AnnouncementTone, string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  mint: "bg-mint-50 text-brand-ink",
  expense: "bg-expense-soft text-expense",
};

export const buildAudienceOptions = (plans: Pick<ISubscriptionPlan, "id" | "name">[], t: Translate = inEnglish) => [
  { value: ALL_PLANS, label: "Everyone" },
  ...plans.map((plan) => ({ value: plan.id, label: t("{name} plan", { name: plan.name }) })),
];
