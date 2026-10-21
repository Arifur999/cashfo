// Audit entries are keyed by a UUID (AuditLog.id is @default(uuid()) in the
// API's schema). Anything else under /admin/security/<id> is a mistyped path,
// and an id that isn't one never goes to the API.
const ENTRY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isAuditEntryId = (value: string) => ENTRY_ID.test(value);
