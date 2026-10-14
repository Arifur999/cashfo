import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// The design's button. Sizes are the control heights from the design system
// (36/40/44/48/52); every variant is 12px radius with the focus ring from
// globals.css. The main button goes forest in light and emerald in dark
// through --primary, and carries the design's button shadow.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-button hover:bg-forest-hover dark:hover:bg-emerald-hover",
        action: "bg-emerald text-on-action hover:bg-emerald-hover",
        secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-sunken",
        // Lighter outline for toolbars (the top bar, in-card actions).
        outline: "border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink",
        soft: "bg-mint-50 text-brand-ink hover:bg-mint-200 dark:hover:bg-emerald/20",
        ghost: "text-ink-2 hover:bg-surface-sunken hover:text-ink",
        danger: "bg-expense-fill text-white hover:bg-expense",
        link: "h-auto rounded-none px-0 text-emerald underline-offset-4 hover:text-emerald-hover hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-small [&_svg:not([class*='size-'])]:size-4",
        md: "h-10 px-4 text-body",
        lg: "h-11 px-5 text-body",
        xl: "h-12 px-4 text-body-lg",
        "2xl": "h-13 px-5 text-body-lg font-bold",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  // Render the child element (a next/link) with the button's classes.
  asChild?: boolean;
}

const Button = ({ className, variant, size, asChild = false, type, ...props }: ButtonProps) => {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
};

export default Button;
