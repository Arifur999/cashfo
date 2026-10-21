import ForgotPasswordForm from "@/components/modules/Auth/ForgotPasswordForm";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";

// Named as its heading names it.
export const generateMetadata = publicPageTitle("Forgot your password?");

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
