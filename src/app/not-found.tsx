import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-content px-4 text-center">
      <h1 className="text-3xl font-bold text-neutral-900">404</h1>
      <p className="text-sm text-neutral-500">This page doesn&apos;t exist.</p>
      <Link href="/admin/dashboard" className="mt-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover">
        Go to Admin Panel
      </Link>
    </div>
  );
}
