import { LoginForm } from "@/components/auth/LoginForm";
import { t } from "@/lib/i18n/t";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-content px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg shadow-black/5">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">{t("Admin Panel")}</h1>
        <p className="mb-6 text-sm text-neutral-500">{t("Sign in to continue")}</p>
        <LoginForm />
      </div>
    </div>
  );
}
