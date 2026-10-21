"use client";

import { Download } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The page header's Export button, as the design draws it on Users and
// Payments: the button sits in the header, and whatever the page shows (a
// table, a chart's months) says what it downloads through useExportAction.
// A run that reads more first (every page of a list) returns its promise,
// and the button waits on it.
type Run = () => void | Promise<void>;

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

export const ExportButton = ({ label = "Export", hint = "Download the selected rows, or every row that matches the filters, as CSV" }: { label?: string; hint?: string }) => {
  const { translate } = useLocale();
  const runRef = useContext(ExportContext);
  // Busy while a run reads its pages; a press meanwhile does nothing.
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    const pending = runRef?.current?.();
    if (!pending) return;
    setBusy(true);
    try {
      await pending;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* aria-disabled, never disabled: a disabled button would drop
          keyboard focus to the page for the minute an export can take. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            aria-disabled={busy || undefined}
            aria-busy={busy || undefined}
            className="aria-disabled:cursor-progress aria-disabled:opacity-50"
            onClick={() => void run()}
          >
            {busy ? <Loader size={14} label="Exporting..." /> : <Download className="size-4 text-ink-2" aria-hidden="true" />}
            {translate(label)}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{translate(hint)}</TooltipContent>
      </Tooltip>
      {/* Outside the button, whose contents a screen reader doesn't announce. */}
      <span aria-live="polite" className="sr-only">
        {busy ? translate("Exporting...") : ""}
      </span>
    </>
  );
};
