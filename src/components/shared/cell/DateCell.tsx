import { formatDate, formatRelativeDay } from "@/lib/date";
import { cn } from "@/lib/utils";

interface DateCellProps {
  date: string | null | undefined;
  formatString?: string;
  // "Today, 11:42 am" / "Yesterday" / "30 Sep" instead of the full date.
  relative?: boolean;
  className?: string;
}

// Renders in the platform timezone (see lib/date.ts), so the server-rendered
// cell and the hydrated one always agree.
const DateCell = ({ date, formatString, relative = false, className }: DateCellProps) => {
  if (!date) {
    return <span className={cn("text-ink-muted", className)}>—</span>;
  }
  return (
    <time dateTime={date} className={cn("whitespace-nowrap text-ink-2", className)}>
      {relative ? formatRelativeDay(date) : formatDate(date, formatString)}
    </time>
  );
};

export default DateCell;
