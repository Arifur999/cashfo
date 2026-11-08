import { EventsPage } from "@/components/modules/Customer/Events/EventsPage";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/events");

// Calendar & Events: the month with every invitation and your own events,
// and what is coming up (?day= opens a day picked).
export default async function EventsCalendarPage({ searchParams }: PageProps<"/events">) {
  const { day } = await searchParams;
  return <EventsPage view="calendar" day={day} />;
}
