import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

// Placeholder rows for the very first load, shaped like the real table so the
// layout doesn't jump when data arrives.
const DataTableSkeleton = ({ columnCount, rowCount }: { columnCount: number; rowCount: number }) => {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columnCount }, (_, cellIndex) => (
            <TableCell key={cellIndex}>
              <Skeleton className="h-4 w-full max-w-36" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export default DataTableSkeleton;
