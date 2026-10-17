"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { exportTranslationsAction } from "@/app/(dashboardLayout)/admin/content/translations/_action";
import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadJson } from "@/lib/download";
import type { ITranslationBundles, TranslationLanguage } from "@/types/translation.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type ExportChoice = TranslationLanguage | "both";

// File names match what the app loads, so a download drops straight in.
const EXPORTS: { choice: ExportChoice; label: string; fileName: string; pick: (bundles: ITranslationBundles) => unknown }[] = [
  { choice: "en", label: "English (en.json)", fileName: "en.json", pick: (bundles) => bundles.en },
  { choice: "bn", label: "Bangla (bn.json)", fileName: "bn.json", pick: (bundles) => bundles.bn },
  { choice: "both", label: "Both languages", fileName: "translations.json", pick: (bundles) => bundles },
];

const ExportTranslationsMenu = () => {
  const [isExporting, startTransition] = useTransition();
  const { translate } = useLocale();

  const exportBundle = (entry: (typeof EXPORTS)[number]) =>
    startTransition(async () => {
      const result = await exportTranslationsAction();
      if (!result.success) {
        toast.error(translate(result.message));
        return;
      }
      downloadJson(entry.pick(result.data), entry.fileName);
      toast.success(translate("Exported {file}", { file: entry.fileName }));
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" disabled={isExporting}>
          {isExporting ? <Loader size={14} label="Exporting..." /> : <Download aria-hidden="true" />}
          <T>Export JSON</T>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPORTS.map((entry) => (
          <DropdownMenuItem key={entry.choice} onClick={() => exportBundle(entry)}>
            <T>{entry.label}</T>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportTranslationsMenu;
