"use client";

import { CheckCheck } from "lucide-react";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import CopyButton from "@/components/shared/CopyButton";
import DescriptionList from "@/components/shared/DescriptionList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/date";
import type { IErrorLog } from "@/types/system.types";
import { statusOfError } from "./errorLogsColumns";

const CodeBlock = ({ label, text }: { label: string; text: string }) => (
  <section className="space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <CopyButton value={text} label={label.toLowerCase()} />
    </div>
    <ScrollArea className="max-h-64 rounded-xl border bg-muted/40">
      <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">{text}</pre>
    </ScrollArea>
  </section>
);

interface ErrorLogDialogProps {
  error: IErrorLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (error: IErrorLog) => void;
  isResolving: boolean;
}

// The full story of one error: message, stack trace and recorded context.
const ErrorLogDialog = ({ error, open, onOpenChange, onResolve, isResolving }: ErrorLogDialogProps) => {
  return (
    <Dialog open={open && error !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {error && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 font-mono text-sm leading-relaxed break-words">{error.message}</DialogTitle>
            </DialogHeader>
            <DescriptionList
              layout="stacked"
              className="sm:grid-cols-4"
              items={[
                { label: "Severity", value: <StatusBadgeCell status={error.severity} /> },
                { label: "Source", value: <StatusBadgeCell status={error.source} /> },
                { label: "Status", value: <StatusBadgeCell status={statusOfError(error)} /> },
                { label: "When", value: formatDateTime(error.createdAt) },
              ]}
            />
            {error.stackTrace && <CodeBlock label="Stack trace" text={error.stackTrace} />}
            {error.metadata && Object.keys(error.metadata).length > 0 && <CodeBlock label="Context" text={JSON.stringify(error.metadata, null, 2)} />}
            {error.resolved && <p className="text-xs text-muted-foreground">Resolved {formatDateTime(error.resolvedAt)}.</p>}
            {!error.resolved && (
              <DialogFooter>
                <Button disabled={isResolving} onClick={() => onResolve(error)}>
                  <CheckCheck aria-hidden="true" /> Mark resolved
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ErrorLogDialog;
