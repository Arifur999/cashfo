import Link from "next/link";
import { cn } from "@/lib/utils";

// Links between the sign-in pages ("Forgot password?", "Create one"): bold
// emerald, as the design draws every link.
const AuthLink = ({ className, ...props }: React.ComponentProps<typeof Link>) => (
  <Link className={cn("rounded-sm font-bold text-emerald hover:text-emerald-hover hover:underline focus-visible:underline", className)} {...props} />
);

export default AuthLink;
