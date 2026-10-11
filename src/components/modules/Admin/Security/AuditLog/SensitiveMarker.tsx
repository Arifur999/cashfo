import { ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Flags audit entries for sensitive actions (impersonation, data resets).
const SensitiveMarker = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex text-destructive" role="img" aria-label="Sensitive action">
          <ShieldAlert className="size-4" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Sensitive action</TooltipContent>
    </Tooltip>
  );
};

export default SensitiveMarker;
