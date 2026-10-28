import Link from "next/link";
import { cn } from "@/lib/utils";

// Links between the sign-in pages ("Forgot password?", "Create an
// account"): semibold primary, as the boards draw them.
const AuthLink = ({ className, ...props }: React.ComponentProps<typeof Link>) => (
  <Link className={cn("rounded-sm font-semibold text-emerald hover:text-emerald-hover hover:underline focus-visible:underline", className)} {...props} />
);

export default AuthLink;
