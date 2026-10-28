import { Gift, Info, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import type { AnnouncementType } from "@/types/announcement.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { ALL_PLANS } from "@/zod/announcement.validation";
import { inEnglish, type Translate } from "@/lib/i18n/message";

// Each kind of banner as the board draws it: its icon, the list's chip, the
// type picker's icon colour, and the banner's wash, edge and words in the
// preview. Info is blue, a warning amber, a promotion mint and maintenance
// a quiet grey.
export const ANNOUNCEMENT_TYPE_META: Record<AnnouncementType, { label: string; icon: LucideIcon; chip: string; iconTone: string; banner: string; bannerIcon: string }> = {
  INFO: { label: "Info", icon: Info, chip: "bg-info-soft text-info", iconTone: "text-info", banner: "border-info-line bg-info-50 text-info-ink", bannerIcon: "text-info" },
  WARNING: { label: "Warning", icon: TriangleAlert, chip: "bg-warning-soft text-warning", iconTone: "text-warning", banner: "border-warning-line bg-warning-50 text-warning-ink", bannerIcon: "text-warning" },
  PROMOTION: { label: "Promotion", icon: Gift, chip: "bg-mint-50 text-emerald", iconTone: "text-emerald", banner: "border-mint-200 bg-emerald-soft text-forest", bannerIcon: "text-emerald" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, chip: "bg-surface-sunken text-ink-2", iconTone: "text-ink-2", banner: "border-line bg-surface-sunken text-ink", bannerIcon: "text-ink-2" },
};

export const buildAudienceOptions = (plans: Pick<ISubscriptionPlan, "id" | "name">[], t: Translate = inEnglish) => [
  { value: ALL_PLANS, label: "Everyone" },
  ...plans.map((plan) => ({ value: plan.id, label: t("{name} plan", { name: plan.name }) })),
];
