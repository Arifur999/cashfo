import { cn } from "@/lib/utils";

// The canvas's small row action (.sm-act): a 34px rounded square with a
// hairline edge and a 15px icon, mint on hover -- red for a delete. A
// button by default; `className` adds to it (a menu's open state, say).
export const iconActionClass = (tone: "default" | "danger" = "default") =>
  cn(
    "inline-flex size-8.5 shrink-0 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-muted transition-[background-color,border-color,color,box-shadow] outline-none",
    "hover:border-mint-200 hover:bg-action-hover hover:text-emerald hover:shadow-[0_1px_2px_rgba(18,32,29,0.06)] focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "disabled:pointer-events-none disabled:opacity-50 pointer-coarse:size-11 [&_svg]:size-3.75",
    tone === "danger" && "hover:border-expense-line hover:bg-expense-soft hover:text-expense-fill",
  );

interface IconActionProps extends React.ComponentProps<"button"> {
  tone?: "default" | "danger";
}

export default function IconAction({ tone = "default", className, type = "button", ...props }: IconActionProps) {
  return <button type={type} className={cn(iconActionClass(tone), className)} {...props} />;
}
