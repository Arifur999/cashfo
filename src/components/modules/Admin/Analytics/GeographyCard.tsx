import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import SectionCard from "@/components/shared/SectionCard";
import type { IGeography } from "@/types/analytics.types";

// Top countries by distinct customers, from where they sign in. The API
// geolocates offline with MaxMind's GeoLite2 data, whose licence (CC BY-SA
// 4.0) asks for the credit below.
const GeographyCard = ({ data }: { data: IGeography }) => {
  return (
    <SectionCard
      title="Top Countries"
      tooltip="Countries with the most distinct customers, from the address of each sign-in. Addresses that can't be placed (private networks) count as Unknown."
    >
      <HorizontalBarList
        items={data.countries
          .slice(0, 10)
          .map((entry) => ({
            label: entry.country,
            value: entry.userCount,
            unit: "users",
          }))}
        emptyMessage="No sign-ins yet."
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Country data: GeoLite2 by{" "}
        <a
          href="https://www.maxmind.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          MaxMind
        </a>
        .
      </p>
    </SectionCard>
  );
};

export default GeographyCard;
