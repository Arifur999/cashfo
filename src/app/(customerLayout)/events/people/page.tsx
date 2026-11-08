import { EventsPage } from "@/components/modules/Customer/Events/EventsPage";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/events/people");

// Calendar & Events › People: who gave what, both ways, over the years.
export default function EventsPeoplePage() {
  return <EventsPage view="people" />;
}
