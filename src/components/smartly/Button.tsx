import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// The design-v4 button: a pill (999px) in every size. md is the 40px button
// of a page header and a drawer or dialog foot, sm the 36px one of a card or
// toolbar, xs the 30px chip; the icon sizes are round. The primary is the
// emerald (#1C7567) with white words and the button shadow; the secondary
// white with the field edge (--input) and ink words; the ghost has no edge.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-button hover:bg-emerald-hover",
        // The same emerald button (kept for the callers that name it so).
        action: "bg-primary text-primary-foreground shadow-button hover:bg-emerald-hover",
        secondary: "border border-input bg-surface text-ink hover:bg-surface-sunken",
        // Lighter outline for toolbars (the top bar, in-card actions).
        outline: "border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink",
        soft: "bg-mint-50 text-brand-ink hover:bg-mint-200 dark:hover:bg-emerald/20",
        ghost: "text-ink-soft hover:bg-surface-sunken hover:text-ink",
        danger: "bg-expense-fill text-white hover:bg-expense",
        link: "h-auto rounded-none px-0 text-emerald underline-offset-4 hover:text-emerald-hover hover:underline",
      },
      size: {
        xs: "h-7.5 px-3 text-small",
        sm: "h-9 px-3.5 text-small",
        md: "h-10 px-4 text-body",
        lg: "h-11 px-5 text-body",
        xl: "h-12 px-5 text-body-lg",
        "2xl": "h-13 px-5 text-body-lg font-bold",
        "icon-xs": "size-8",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4.5",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-4.5",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-4.5",
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
