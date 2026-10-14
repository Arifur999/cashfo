import { cn } from "@/lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  invalid?: boolean;
}

// A multi-line input in the same frame as Input, growing with its rows.
const Textarea = ({ invalid = false, className, id, ...props }: TextareaProps) => (
  <textarea
    id={id}
    aria-invalid={invalid || undefined}
    aria-describedby={invalid && id ? `${id}-error` : undefined}
    className={cn(
      "block w-full min-w-0 rounded-md border bg-surface px-4 py-3 text-body text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint disabled:opacity-60",
      "focus:border-emerald focus:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]",
      invalid ? "border-expense shadow-[0_0_0_0.5px_var(--expense)]" : "border-line-strong",
      className,
    )}
    {...props}
  />
);

export default Textarea;
