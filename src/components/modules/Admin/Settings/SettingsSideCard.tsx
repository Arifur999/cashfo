import type { LucideIcon } from "lucide-react";
import Card from "@/components/smartly/Card";
import { cn } from "@/lib/utils";

const TONES = {
  mint: "bg-mint-50 text-emerald",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
} as const;

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
      <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-md", TONES[tone])}>
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <h2 className="text-title text-ink">{title}</h2>
    </div>
    <div className="text-small leading-normal text-ink-2">{children}</div>
    {action}
  </Card>
);

export const SIDE_CARD_LINK = "inline-flex items-center gap-1 self-start text-small font-semibold text-emerald hover:underline";

export default SettingsSideCard;
