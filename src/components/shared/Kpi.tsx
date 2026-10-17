import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { cn } from "@/lib/utils";

export type ChipTone = "income" | "expense" | "warning" | "info" | "neutral";

interface KpiProps {
  label: string;
  value: React.ReactNode;
  // A chip beside the note: "+212", "15.4%".
  chip?: { text: string; tone: ChipTone } | null;
  note?: React.ReactNode;
  className?: string;
}

// One figure on an admin page: label, value, and a chip with a note under it.
const Kpi = ({ label, value, chip, note, className }: KpiProps) => {
  return (
    <Card padding="none" className={cn("flex flex-col gap-2 px-5 py-4", className)}>
      <span className="text-small text-ink-muted">{label}</span>
      <span className="text-h1 text-ink tabular-nums">{value}</span>
      {(chip || note) && (
        <span className="flex items-center gap-2 text-small text-ink-muted">
          {chip && (
            <Chip tone={chip.tone} size="sm">
              {chip.text}
            </Chip>
          )}
          {note}
        </span>
      )}
    </Card>
  );
};

export default Kpi;
