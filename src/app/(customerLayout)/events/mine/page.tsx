import { EventsPage } from "@/components/modules/Customer/Events/EventsPage";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/events/mine");

// Calendar & Events › My events: events you hosted, and what people gave.
export default function EventsMinePage() {
  return <EventsPage view="mine" />;
}
