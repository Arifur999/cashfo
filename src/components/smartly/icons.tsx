import { cn } from "@/lib/utils";

type IconProps = React.ComponentProps<"svg">;

// The two glyphs the design draws that lucide doesn't have, in lucide's own
// stroke style so they sit beside its icons.
export const MosqueIcon = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("size-4", className)} {...props}>
    <path d="M12 2v3" />
    <path d="M6 11a6 6 0 0 1 12 0" />
    <path d="M4 21V11h16v10" />
    <path d="M2 21h20" />
    <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
  </svg>
);

export const TakaIcon = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("size-4", className)} {...props}>
    <path d="M8 4h2a3 3 0 0 1 3 3v9a4 4 0 0 0 8 0" />
    <path d="M9 11h8" />
  </svg>
);
