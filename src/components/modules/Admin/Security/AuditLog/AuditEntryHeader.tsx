import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import DescriptionList from "@/components/shared/DescriptionList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { isSensitiveAuditEntry } from "@/lib/auditDiff";
import { formatDateTime } from "@/lib/date";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import { entityReference } from "./auditLogColumns";
import SensitiveMarker from "./SensitiveMarker";

const AuditEntryHeader = ({ entry }: { entry: IAuditLogEntry }) => {
  return (
    <Card className="shadow-sm shadow-black/5">
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">Audit entry</p>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              {isSensitiveAuditEntry(entry.newValue) && <SensitiveMarker />}
              {auditActionLabel(entry.action)}
            </h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/security">
              <ArrowLeft aria-hidden="true" /> Audit log
            </Link>
          </Button>
        </div>
        <DescriptionList
          layout="stacked"
          className="sm:grid-cols-4"
          items={[
            { label: "Admin", value: entry.adminUser.name },
            { label: "Record", value: <span className="font-mono text-xs">{entityReference(entry)}</span> },
            { label: "IP address", value: <span className="font-mono text-xs">{entry.ipAddress ?? "—"}</span> },
            { label: "Date", value: formatDateTime(entry.createdAt) },
          ]}
        />
      </CardContent>
    </Card>
  );
};

export default AuditEntryHeader;
