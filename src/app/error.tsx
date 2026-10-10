"use client";

import { ServerCrash } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Catches what the dashboard's own error.tsx can't: a failure in the
// (dashboardLayout) layout itself -- typically the backend being unreachable
// while it loads the current admin. Next 16.3: `retry`, not `reset`.
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <ServerCrash className="size-10 text-destructive" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-foreground">We couldn&apos;t load the admin panel</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The server may be temporarily unavailable. Check that the backend is running, then try again.
      </p>
      <Button onClick={() => retry()} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
