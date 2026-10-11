import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import SectionCard from "@/components/shared/SectionCard";
import type { IGeography } from "@/types/analytics.types";

// Top cities by distinct users.
const GeographyCard = ({ data }: { data: IGeography }) => {
  return (
    <SectionCard title="Top Cities" tooltip="Cities with the most distinct users, from location-tagged activity.">
      <HorizontalBarList
        items={data.cities.slice(0, 10).map((entry) => ({ label: `${entry.city}, ${entry.country}`, value: entry.userCount, unit: "users" }))}
        emptyMessage="No location data yet -- activity isn't geolocated."
      />
    </SectionCard>
  );
};

export default GeographyCard;
