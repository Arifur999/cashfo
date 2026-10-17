import { WorkspacesSection } from "@/components/modules/Customer/Settings/WorkspacesSection";
import { listBusinessesAction } from "@/lib/customer/businessActions";

// The list is read here so the page arrives filled in.
export default async function SettingsWorkspacesPage() {
  const result = await listBusinessesAction();
  return <WorkspacesSection initialBusinesses={result.success && result.data ? result.data : []} />;
}
