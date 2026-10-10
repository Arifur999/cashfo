import { Info } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  // Explains what the section measures; shown behind an info icon.
  tooltip?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const SectionCard = ({ title, tooltip, action, className, children }: SectionCardProps) => {
  return (
    <Card className={cn("shadow-sm shadow-black/5", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground" aria-label={`About ${title}`}>
                  <Info className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default SectionCard;
