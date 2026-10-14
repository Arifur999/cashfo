import { cn } from "@/lib/utils";

interface PageFrameProps extends React.ComponentProps<"div"> {
  // Home stacks its sections 40px apart; list pages 16px.
  gap?: "sm" | "lg";
}

// The content column of an app page: the design's 32px frame (20/16 on
// phones, with room for the floating button), capped at the content width.
const PageFrame = ({ gap = "sm", className, ...props }: PageFrameProps) => (
  <div
    className={cn("mx-auto flex w-full max-w-content flex-col px-4 pt-5 pb-24 md:px-8 md:pt-8 md:pb-12", gap === "lg" ? "gap-8 md:gap-10" : "gap-4", className)}
    {...props}
  />
);

export default PageFrame;
