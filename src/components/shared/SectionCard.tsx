"use client";

import { Info } from "lucide-react";
import Card from "@/components/smartly/Card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  // Explains what the section measures; shown behind an info icon.
  tooltip?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// A titled section on the design's card: the title (with its info tip) and
// an action on one line, the content under it.
const SectionCard = ({ title, tooltip, action, className, children }: SectionCardProps) => {
  const { translate } = useLocale();
  return (
    <Card padding="none" className={cn("flex flex-col gap-3 px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-1.5 text-title text-ink">
          {translate(title)}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="shrink-0 rounded-sm text-ink-muted transition-colors hover:text-ink" aria-label={translate("About {title}", { title: translate(title) })}>
                  <Info className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{translate(tooltip)}</TooltipContent>
            </Tooltip>
          )}
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  );
};

export default SectionCard;
