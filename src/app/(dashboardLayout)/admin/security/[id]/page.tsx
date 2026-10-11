import type { Metadata } from "next";
import AuditEntryHeader from "@/components/modules/Admin/Security/AuditLog/AuditEntryHeader";
import AuditValueDiff from "@/components/modules/Admin/Security/AuditLog/AuditValueDiff";
import SectionCard from "@/components/shared/SectionCard";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getAuditLogById } from "@/services/security.services";

export const metadata: Metadata = { title: "Audit Entry" };

// Outside the (sections) group on purpose: a single entry, without the tabs.
const AuditEntryPage = async ({ params }: PageProps<"/admin/security/[id]">) => {
  const { id } = await params;
  const entry = await fetchOrNotFound(getAuditLogById(id));

  return (
    <div className="space-y-6">
      <AuditEntryHeader entry={entry} />
      <SectionCard title="What changed" tooltip="The record's values before and after the action, as the API logged them.">
        <AuditValueDiff oldValue={entry.oldValue} newValue={entry.newValue} />
      </SectionCard>
    </div>
  );
};

export default AuditEntryPage;
