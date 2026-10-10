import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

interface DateCellProps {
  date: string | null | undefined;
  formatString?: string;
  className?: string;
}

// Renders in the platform timezone (see lib/date.ts), so the server-rendered
// cell and the hydrated one always agree.
const DateCell = ({ date, formatString, className }: DateCellProps) => {
  if (!date) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }
  return (
    <time dateTime={date} className={cn("whitespace-nowrap text-muted-foreground", className)}>
      {formatDate(date, formatString)}
    </time>
  );
};

export default DateCell;
