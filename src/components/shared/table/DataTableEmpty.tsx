import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableEmptyProps {
  message: string;
  canReset: boolean;
  onReset: () => void;
}

const DataTableEmpty = ({ message, canReset, onReset }: DataTableEmptyProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <SearchX className="size-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {canReset && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      )}
    </div>
  );
};

export default DataTableEmpty;
