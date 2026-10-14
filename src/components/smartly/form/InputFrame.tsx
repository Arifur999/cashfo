import { cn } from "@/lib/utils";

export const INPUT_HEIGHTS = {
  // 38 in toolbars, 44 in drawers, 48 in settings forms, 52 on sign-in and
  // every phone sheet (16px text there, so phones don't zoom).
  sm: "h-[38px] text-body",
  md: "h-11 text-body",
  lg: "h-12 text-body",
  xl: "h-13 text-body-lg",
} as const;

interface InputFrameProps extends React.ComponentProps<"div"> {
  size?: keyof typeof INPUT_HEIGHTS;
  invalid?: boolean;
}

// The box around a text control: the line-strong border, 12px radius, the
// emerald border and mint ring while focused, the red border when wrong.
// The focus border is drawn as a shadow so nothing shifts by half a pixel.
const InputFrame = ({ size = "lg", invalid = false, className, ...props }: InputFrameProps) => (
  <div
    data-invalid={invalid || undefined}
    className={cn(
      "flex items-center gap-2 rounded-md border bg-surface px-4 text-ink transition-[border-color,box-shadow]",
      "focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]",
      invalid ? "border-expense shadow-[0_0_0_0.5px_var(--expense)]" : "border-line-strong",
      INPUT_HEIGHTS[size],
      className,
    )}
    {...props}
  />
);

export default InputFrame;
