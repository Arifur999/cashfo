import { notFound, redirect } from "next/navigation";
import { isAuditEntryId } from "@/components/modules/Admin/Security/AuditLog/auditEntryId";

// An entry now opens in a drawer over the audit log; old links to its own
// page land there. Anything that isn't an entry's id (a typo such as
// /admin/security/login) is a 404, not an "Entry not found" drawer.
const AuditEntryPage = async ({ params }: PageProps<"/admin/security/[id]">) => {
  const { id } = await params;
  if (!isAuditEntryId(id)) notFound();
  redirect(`/admin/security?entry=${encodeURIComponent(id)}`);
};

export default AuditEntryPage;
