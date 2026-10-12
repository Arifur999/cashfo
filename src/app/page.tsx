import { redirect } from "next/navigation";
import { LOGIN_ROUTE } from "@/lib/authUtils";

// proxy.ts answers "/" itself -- the visitor's home, or the sign-in page --
// so this only runs if it ever stops doing that.
export default function RootPage() {
  redirect(LOGIN_ROUTE);
}
