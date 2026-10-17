"use client";

import { Download } from "lucide-react";
import { createContext, useContext, useEffect, useRef, type RefObject } from "react";
import Button from "@/components/smartly/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The page header's Export button, as the design draws it on Users and
// Payments: the button sits in the header, and whatever the page shows (a
// table, a chart's months) says what it downloads through useExportAction.
type Run = () => void;

const ExportContext = createContext<RefObject<Run | null> | null>(null);

export const ExportProvider = ({ children }: { children: React.ReactNode }) => {
  const runRef = useRef<Run | null>(null);
  return <ExportContext value={runRef}>{children}</ExportContext>;
};

// What the header's Export downloads while the caller is on screen. Outside
// an ExportProvider it does nothing.
export const useExportAction = (run: Run | null) => {
  const runRef = useContext(ExportContext);
  useEffect(() => {
    if (!runRef || !run) return;
    runRef.current = run;
    return () => {
      if (runRef.current === run) runRef.current = null;
    };
  });
};

export const ExportButton = ({ label = "Export", hint = "Download the selected rows, or all rows shown, as CSV" }: { label?: string; hint?: string }) => {
  const { translate } = useLocale();
  const runRef = useContext(ExportContext);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="secondary" onClick={() => runRef?.current?.()}>
          <Download className="size-4 text-ink-2" aria-hidden="true" />
          {translate(label)}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{translate(hint)}</TooltipContent>
    </Tooltip>
  );
};
