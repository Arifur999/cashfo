import { cn } from "@/lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  invalid?: boolean;
}

// A multi-line input in the same frame as Input, growing with its rows. Its
// text is 16px below md, as a drawer's Input is, so iOS doesn't zoom in.
const Textarea = ({ invalid = false, className, id, ...props }: TextareaProps) => (
  <textarea
    id={id}
    aria-invalid={invalid || undefined}
    aria-describedby={invalid && id ? `${id}-error` : undefined}
    className={cn(
      "block w-full min-w-0 resize-none rounded-field border bg-surface px-3 py-2.5 text-body leading-normal text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint disabled:opacity-60 max-md:text-body-lg",
      invalid ? "border-expense focus:error-halo" : "border-input focus:border-focus-ring focus:focus-halo",
      className,
    )}
    {...props}
  />
);

export default Textarea;
