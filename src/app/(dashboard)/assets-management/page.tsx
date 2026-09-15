import { Boxes } from "lucide-react";

// Placeholder page -- the sidebar menu was added at the user's explicit
// request before deciding what it should track (fixed assets like land/
// vehicles/jewellery/investments, most likely). Same "visibly present but
// not yet built" treatment as every other placeholder in this app (Settings'
// App/Help/Resources tabs, SecurityTab's 2FA toggle) rather than omitting
// the page or faking a working feature.
export default function AssetsManagementPage() {
  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Assets Management</h1>
      <p className="mt-1 text-sm text-neutral-500">Track and manage your physical and financial assets.</p>

      <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-surface p-6 text-center shadow-sm shadow-black/5">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Boxes className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-neutral-900">Coming Soon</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Asset tracking (land, vehicles, jewellery, investments, and more) is on the way. Let us know what you&apos;d like to track first.
        </p>
      </div>
    </div>
  );
}
