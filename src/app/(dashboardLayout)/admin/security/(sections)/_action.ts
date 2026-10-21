"use server";

import { isAxiosError } from "axios";
import { isAuditEntryId } from "@/components/modules/Admin/Security/AuditLog/auditEntryId";
import { getAuditLogById } from "@/services/security.services";
import type { IAuditLogEntry } from "@/types/auditLog.types";

// What the audit entry drawer gets back. "missing" is an answer: no entry has
// that id (the API says 404). "failed" means the API didn't answer (a 5xx, a
// timeout), so the drawer offers Try again instead of calling the link wrong.
// A value, never a throw: an error thrown here reaches the browser without
// its status.
export type AuditEntryLookup = { status: "found"; entry: IAuditLogEntry } | { status: "missing" } | { status: "failed" };

export const lookupAuditEntryAction = async (id: string): Promise<AuditEntryLookup> => {
  if (!isAuditEntryId(id)) return { status: "missing" };
  try {
    const { data } = await getAuditLogById(id);
    return { status: "found", entry: data };
  } catch (error) {
    if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 400)) {
      return { status: "missing" };
    }
    return { status: "failed" };
  }
};
