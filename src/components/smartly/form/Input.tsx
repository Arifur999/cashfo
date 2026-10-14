import { cn } from "@/lib/utils";
import InputFrame, { type INPUT_HEIGHTS } from "./InputFrame";

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  size?: keyof typeof INPUT_HEIGHTS;
  invalid?: boolean;
  // Inside the box, before the text ("৳", a search icon).
  leading?: React.ReactNode;
  // Inside the box, after the text (a show-password button).
  trailing?: React.ReactNode;
  frameClassName?: string;
}

// A text input in the design's frame. Pass `invalid` with the Field's error
// so the border turns red together with the message.
const Input = ({ size = "lg", invalid = false, leading, trailing, frameClassName, className, id, ...props }: InputProps) => (
  <InputFrame size={size} invalid={invalid} className={cn(trailing && "pr-1", frameClassName)}>
    {leading && <span className="flex shrink-0 items-center text-ink-muted [&_svg]:size-4">{leading}</span>}
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn("h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint disabled:opacity-60", className)}
      {...props}
    />
    {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
  </InputFrame>
);

export default Input;
