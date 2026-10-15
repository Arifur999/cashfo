import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import type { Tone } from "@/components/smartly/tones";
import { cn } from "@/lib/utils";

interface SayCardProps {
  icon: React.ReactNode;
  tone: Tone;
  // The sentence, and the line that backs it up.
  say: React.ReactNode;
  why: React.ReactNode;
  className?: string;
}

// One plain sentence about the numbers: a 40px tile, the claim in bold, the
// reason under it. Three sit at the top of Insights.
export function SayCard({ icon, tone, say, why, className }: SayCardProps) {
  return (
    <Card padding="none" className={cn("flex items-start gap-3 p-4 md:gap-4 md:p-5", className)}>
      <IconTile tone={tone} size={40}>
        {icon}
      </IconTile>
      <span className="flex min-w-0 flex-col gap-0.5 md:gap-1">
        <b className="text-body font-bold text-ink md:text-title md:font-semibold">{say}</b>
        <span className="text-small text-ink-muted">{why}</span>
      </span>
    </Card>
  );
}
