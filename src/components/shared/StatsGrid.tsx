import { cn } from "@/lib/utils";
import StatsCard, { type StatsCardProps } from "./StatsCard";

const COLUMN_CLASSES = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

interface StatsGridProps {
  // Plain data (icon by name), so a page can build the list on the server.
  items: StatsCardProps[];
  columns?: keyof typeof COLUMN_CLASSES;
}

const StatsGrid = ({ items, columns = 4 }: StatsGridProps) => {
  return (
    <div className={cn("grid grid-cols-1 gap-4", COLUMN_CLASSES[columns])}>
      {items.map((item) => (
        <StatsCard key={item.title} {...item} />
      ))}
    </div>
  );
};

export default StatsGrid;
