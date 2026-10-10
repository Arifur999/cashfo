import { TrendingDown, TrendingUp } from "lucide-react";
import { createElement } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getIconComponent, type IconName } from "@/lib/iconMapper";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: React.ReactNode;
  // A name, not a component, so a stats config array stays serializable
  // across the server/client boundary.
  iconName: IconName;
  trend?: { value: number; label: string } | null;
  description?: string;
}

const StatsCard = ({ title, value, iconName, trend, description }: StatsCardProps) => {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <Card size="sm" className="shadow-sm shadow-black/5">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {createElement(getIconComponent(iconName), { className: "size-4", "aria-hidden": true })}
          <span className="text-xs font-medium tracking-wide uppercase">{title}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {trend && (
          <p className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-brand-primary-hover" : "text-destructive")}>
            {isPositive ? <TrendingUp className="size-3.5" aria-hidden="true" /> : <TrendingDown className="size-3.5" aria-hidden="true" />}
            {Math.abs(trend.value).toFixed(1)}% {trend.label}
          </p>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
