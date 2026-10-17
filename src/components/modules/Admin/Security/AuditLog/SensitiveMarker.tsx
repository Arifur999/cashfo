import { ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Flags audit entries for sensitive actions (impersonation, data resets).
const SensitiveMarker = () => {
  const { translate } = useLocale();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex text-destructive" role="img" aria-label={translate("Sensitive action")}>
          <ShieldAlert className="size-4" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent><T>Sensitive action</T></TooltipContent>
    </Tooltip>
  );
};

export default SensitiveMarker;
