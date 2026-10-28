import { AlarmClock, Ban, BookOpen, Droplet, Footprints, Moon, Smartphone, Target, type LucideIcon } from "lucide-react";
import { challengeLook, type ChallengeIcon, type ChallengeTint } from "@/lib/customer/challengeDisplay";
import { cn } from "@/lib/utils";

const ICONS: Record<ChallengeIcon, LucideIcon> = {
  ban: Ban,
  alarm: AlarmClock,
  book: BookOpen,
  phone: Smartphone,
  walk: Footprints,
  water: Droplet,
  prayer: Moon,
  target: Target,
};

// The soft fill and ink of each tint, from the palette tokens.
const TINTS: Record<ChallengeTint, string> = {
  rose: "bg-rose-soft text-rose",
  amber: "bg-warning-soft text-warning",
  orange: "bg-orange-soft text-orange",
  indigo: "bg-info-soft text-info",
  green: "bg-income-soft text-income",
  cyan: "bg-pillar-insights-soft text-pillar-insights",
  violet: "bg-pillar-habits-soft text-pillar-habits",
};

const SIZES = {
  // A row of the Finished list.
  32: "size-8 rounded-[9px] [&_svg]:size-4",
  // A card going on now.
  40: "size-10 rounded-[11px] [&_svg]:size-5",
  // The head card of a challenge's own page.
  48: "size-12 rounded-md [&_svg]:size-6",
} as const;

// A challenge's icon on its tint (design-v4 ChallengesHome), both picked from its name.
export function ChallengeTile({ name, size = 40, className }: { name: string | null; size?: keyof typeof SIZES; className?: string }) {
  const look = challengeLook(name);
  const Icon = ICONS[look.icon];
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center", SIZES[size], TINTS[look.tint], className)}>
      <Icon />
    </span>
  );
}
