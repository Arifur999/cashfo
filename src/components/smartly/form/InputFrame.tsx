import { cn } from "@/lib/utils";

export const INPUT_HEIGHTS = {
  // 38 in toolbars, 44 in drawers, 48 in settings forms, 52 on sign-in and
  // every phone sheet (16px text there, so phones don't zoom). Drawers and
  // settings open on phones too, so their text is 16px below md as well:
  // iOS zooms into a field set smaller than that.
  sm: "h-9.5 text-body",
  md: "h-11 text-body max-md:text-body-lg",
  lg: "h-12 text-body max-md:text-body-lg",
  xl: "h-13 text-body-lg",
  // The sign-up forms: 48px with 16px text on a phone, 44px on wider
  // screens, as RegisterMobile and Register draw them.
  auth: "h-12 text-body-lg md:h-11 md:text-body",
  // The sign-in form: 48px on a phone (LoginMobile), 52px wider (Main,
  // SignedOut), 16px text in both; the wider boards draw no field icons.
  signIn: "h-12 text-body-lg md:h-13",
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
