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

type ExportChoice = TranslationLanguage | "both";

// File names match what the app loads, so a download drops straight in.
const EXPORTS: { choice: ExportChoice; label: string; fileName: string; pick: (bundles: ITranslationBundles) => unknown }[] = [
  { choice: "en", label: "English (en.json)", fileName: "en.json", pick: (bundles) => bundles.en },
  { choice: "bn", label: "Bangla (bn.json)", fileName: "bn.json", pick: (bundles) => bundles.bn },
  { choice: "both", label: "Both languages", fileName: "translations.json", pick: (bundles) => bundles },
];

const ExportTranslationsMenu = () => {
  const [isExporting, startTransition] = useTransition();

  const exportBundle = (entry: (typeof EXPORTS)[number]) =>
    startTransition(async () => {
      const result = await exportTranslationsAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      downloadJson(entry.pick(result.data), entry.fileName);
      toast.success(`Exported ${entry.fileName}`);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" disabled={isExporting}>
          {isExporting ? <Loader size={14} label="Exporting..." /> : <Download aria-hidden="true" />}
          Export JSON
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPORTS.map((entry) => (
          <DropdownMenuItem key={entry.choice} onClick={() => exportBundle(entry)}>
            {entry.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportTranslationsMenu;
