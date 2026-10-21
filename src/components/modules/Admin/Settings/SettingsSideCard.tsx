import type { LucideIcon } from "lucide-react";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";

// The card's tint, as IconTile names it.
const TONES = { mint: "money", warning: "warning", info: "info" } as const;

interface SettingsSideCardProps {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  title: string;
  children: React.ReactNode;
  // A link or button to where the setting is changed.
  action?: React.ReactNode;
}

// The small cards beside Settings' General card: a tinted icon, a title,
// what it is set to now, and where to change it.
const SettingsSideCard = ({ icon: Icon, tone, title, children, action }: SettingsSideCardProps) => (
  <Card className="flex flex-col gap-2">
    <div className="flex items-center gap-3">
      <IconTile size={36} tone={TONES[tone]}>
        <Icon />
      </IconTile>
      <h2 className="text-title text-ink">
        <T>{title}</T>
      </h2>
    </div>
    <div className="text-small leading-normal text-ink-2">{children}</div>
    {action}
  </Card>
);

// 44px tall under a finger, like every other control.
export const SIDE_CARD_LINK = "inline-flex items-center gap-1 self-start text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11";

export default SettingsSideCard;
