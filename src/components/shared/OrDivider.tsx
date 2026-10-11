import { Separator } from "@/components/ui/separator";

// "──── or ────" between two alternative ways of doing the same thing.
const OrDivider = ({ label = "or" }: { label?: string }) => (
  <div className="flex items-center gap-3">
    <Separator className="flex-1" />
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <Separator className="flex-1" />
  </div>
);

export default OrDivider;
