import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-content px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg shadow-black/5">
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">Coming soon</h1>
        <p className="mb-6 text-sm text-neutral-500">Password reset isn&apos;t available yet -- it&apos;s planned for a later prompt.</p>
        <Link href="/login" className="text-sm font-medium text-brand-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
