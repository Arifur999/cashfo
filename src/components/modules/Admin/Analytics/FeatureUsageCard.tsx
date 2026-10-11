import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import SectionCard from "@/components/shared/SectionCard";
import type { IFeatureUsageEntry } from "@/types/analytics.types";
import { featureLabel } from "./analyticsLabels";

const FeatureUsageCard = ({ data }: { data: IFeatureUsageEntry[] }) => {
  return (
    <SectionCard title="Feature Usage" tooltip="How many times each action was performed in the selected range.">
      <HorizontalBarList items={data.map((entry) => ({ label: featureLabel(entry.eventType), value: entry.count }))} />
    </SectionCard>
  );
};

export default FeatureUsageCard;
