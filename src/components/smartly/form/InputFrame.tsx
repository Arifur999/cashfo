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
  // The sign-in pages: 48px with 16px text on a phone, 44px on wider
  // screens, as LoginMobile/RegisterMobile and Main/Register draw them --
  // the icon 14px in and the text at 42px.
  auth: "h-12 gap-2.5 pl-3.5 text-body-lg md:h-11 md:text-body",
} as const;

interface InputFrameProps extends React.ComponentProps<"div"> {
  size?: keyof typeof INPUT_HEIGHTS;
  invalid?: boolean;
}

// The box around a text control (design-v4): the field edge (--input), 10px
// corners, 12px in from the sides; while focused the edge turns the focus
// colour with a 3px halo of it, and red with a red halo when wrong.
const InputFrame = ({ size = "lg", invalid = false, className, ...props }: InputFrameProps) => (
  <div
    data-invalid={invalid || undefined}
    className={cn(
      "flex items-center gap-2 rounded-field border bg-surface px-3 text-ink transition-[border-color,box-shadow]",
      invalid ? "border-expense focus-within:error-halo" : "border-input focus-within:border-focus-ring focus-within:focus-halo",
      INPUT_HEIGHTS[size],
      className,
    )}
    {...props}
  />
);

export default InputFrame;
