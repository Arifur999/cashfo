import { AlertTriangle, Info, Megaphone, Wrench, type LucideIcon } from "lucide-react";
import type { AnnouncementType } from "@/types/announcement.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { ALL_PLANS } from "@/zod/announcement.validation";
import { inEnglish, type Translate } from "@/lib/i18n/message";

type AnnouncementTone = "info" | "warning" | "mint" | "expense";

// Each kind of banner: its icon and its colour, the same pairing the app's
// banner uses (Customer/Layout/AnnouncementBanner.tsx), so the list's
// chip, the type picker and the preview read as the app draws it.
export const ANNOUNCEMENT_TYPE_META: Record<AnnouncementType, { label: string; icon: LucideIcon; tone: AnnouncementTone }> = {
  INFO: { label: "Info", icon: Info, tone: "info" },
  WARNING: { label: "Warning", icon: AlertTriangle, tone: "warning" },
  PROMOTION: { label: "Promotion", icon: Megaphone, tone: "mint" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, tone: "expense" },
};

// The smartly Banner's name for each tone.
export const BANNER_TONE: Record<AnnouncementTone, "info" | "warning" | "mint" | "danger"> = {
  info: "info",
  warning: "warning",
  mint: "mint",
  expense: "danger",
};

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
