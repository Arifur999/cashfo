import Link from "next/link";
import { cn } from "@/lib/utils";

// Links between the sign-in pages ("Forgot password?", "Create one"). Dark
// green rather than the brand's bright green, which is too light to read
// as small text on white.
const AuthLink = ({ className, ...props }: React.ComponentProps<typeof Link>) => (
  <Link
    className={cn("rounded-sm font-medium text-brand-dark underline-offset-4 hover:underline focus-visible:underline dark:text-brand-primary", className)}
    {...props}
  />
);

export default AuthLink;
