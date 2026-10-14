import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

interface CardProps extends React.ComponentProps<"div"> {
  padding?: keyof typeof PADDING;
  // The design's card shadow; off for cards that sit inside another card.
  elevated?: boolean;
  // A card that is a link or a button: the border darkens on hover.
  interactive?: boolean;
  // Render the child (a next/link, a section) with the card's classes.
  asChild?: boolean;
}

// The white panel every list, chart and figure sits on: 16px radius, the
// line border, 20px padding unless told otherwise.
const Card = ({ padding = "md", elevated = true, interactive = false, asChild = false, className, ...props }: CardProps) => {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="card"
      className={cn(
        "rounded-lg border border-line bg-surface text-ink",
        PADDING[padding],
        elevated && "shadow-card",
        interactive && "transition-colors hover:border-line-strong",
        className,
      )}
      {...props}
    />
  );
};

export default Card;
