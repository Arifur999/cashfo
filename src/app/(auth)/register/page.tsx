import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-content px-4">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
