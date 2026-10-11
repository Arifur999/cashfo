import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEFAULT_DASHBOARD_ROUTE } from "@/lib/authUtils";

// Outside the dashboard shell: a URL no route matches at all.
export default function RootNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <p className="text-5xl font-bold text-foreground tabular-nums">404</p>
      <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">This page doesn&apos;t exist.</p>
      <Button asChild className="mt-2">
        <Link href={DEFAULT_DASHBOARD_ROUTE}>Go to the admin panel</Link>
      </Button>
    </main>
  );
}
