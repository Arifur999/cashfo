"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { reportErrorAction } from "@/app/-actions/reportErrorAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  // Next 16.3+: re-renders the segment and re-fetches its data.
  retry: () => void;
}

// A page inside the dashboard threw. The shell (sidebar, navbar) stays up;
// only the content area is replaced, and the crash is logged to System >
// Error Logs as an ADMIN_FRONTEND error.
export default function DashboardError({ error, retry }: DashboardErrorProps) {
  useEffect(() => {
    void reportErrorAction({ message: error.message || "Unknown error", stackTrace: error.stack });
  }, [error]);

  return (
    <Card className="shadow-sm shadow-black/5">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This page hit an unexpected error. Try again, or head somewhere else from the sidebar.
        </p>
        {error.digest && <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
        <Button onClick={() => retry()} className="mt-2">
          <RotateCcw aria-hidden="true" /> Try again
        </Button>
      </CardContent>
    </Card>
  );
}
