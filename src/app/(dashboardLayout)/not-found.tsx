import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ADMIN_HOME_ROUTE } from "@/lib/authUtils";
import T from "@/components/shared/T";

// An unknown URL, or a detail page whose record doesn't exist (see
// fetchOrNotFound). Rendered inside the dashboard shell.
export default function DashboardNotFound() {
  return (
    <Card className="shadow-sm shadow-black/5">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground"><T>Not found</T></h1>
        <p className="max-w-md text-sm text-muted-foreground"><T>The page or record you&apos;re looking for doesn&apos;t exist, or was removed.</T></p>
        <Button asChild className="mt-2">
          <Link href={ADMIN_HOME_ROUTE}><T>Back to dashboard</T></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
