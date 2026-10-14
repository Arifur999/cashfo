import { cn } from "@/lib/utils";

// A keyboard key, as the menus show their shortcuts.
const Kbd = ({ className, ...props }: React.ComponentProps<"kbd">) => (
  <kbd
    className={cn("inline-flex items-center rounded-sm border border-line bg-surface px-2 py-0.5 font-mono text-code text-ink-muted", className)}
    {...props}
  />
);

export default Kbd;
