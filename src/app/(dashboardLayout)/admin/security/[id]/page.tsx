import { redirect } from "next/navigation";

// An entry now opens in a drawer over the audit log; old links to its own
// page land there.
const AuditEntryPage = async ({ params }: PageProps<"/admin/security/[id]">) => {
  const { id } = await params;
  redirect(`/admin/security?entry=${encodeURIComponent(id)}`);
};

export default AuditEntryPage;
