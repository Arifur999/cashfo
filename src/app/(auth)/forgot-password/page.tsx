import type { Metadata } from "next";
import AuthShell from "@/components/modules/Auth/AuthShell";
import ForgotPasswordForm from "@/components/modules/Auth/ForgotPasswordForm";
import MaintenanceNotice from "@/components/modules/Auth/MaintenanceNotice";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell hero="narrow" notice={<MaintenanceNotice />}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
