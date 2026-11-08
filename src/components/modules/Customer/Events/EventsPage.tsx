import { redirect } from "next/navigation";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getEventsOverview } from "@/lib/customer/events";
import { getAppToday } from "@/lib/date";
import { EventsPageClient, type EventsView } from "./EventsPageClient";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// The server half of Calendar & Events' three pages: the open workspace's
// people and events. Its owner and accountant keep them, so only they see
// them; "View as customer" may look, not change.
export async function EventsPage({ view, day }: { view: EventsView; day?: string | string[] }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canSee = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const overview = canSee ? await getEventsOverview(activeBusinessId) : null;
  const picked = typeof day === "string" && DAY.test(day) ? day : null;

  return (
    <EventsPageClient
      view={view}
      businessId={activeBusinessId}
      overview={overview}
      today={getAppToday()}
      day={picked}
      currency={activeBusiness?.currency ?? "BDT"}
      canSee={canSee}
      readOnly={Boolean(user.impersonatedBy)}
    />
  );
}
