import { ERROR_SOURCE_LABEL, type ErrorGroup, groupErrors } from "@/lib/errorGroups";
import type { IErrorLog } from "@/types/system.types";
import { CUSTOMER_APP } from "./errorsQuery";

type LogOrigin = Pick<IErrorLog, "source" | "metadata">;

// The customer app's error screen reports under the admin panel's
// ADMIN_FRONTEND source (there is no source of its own), marked
// metadata.app = "customer".
export const isCustomerAppError = (log: Pick<IErrorLog, "metadata">) => log.metadata?.app === CUSTOMER_APP;

// Where it happened, as the chip says it: "Customer app" for those reports,
// else the source's own name ("Server", "Admin panel").
export const errorOriginLabel = (log: LogOrigin): string => (isCustomerAppError(log) ? "Customer app" : ERROR_SOURCE_LABEL[log.source]);

// The reference the error screen showed (Next's digest), which a customer
// quotes to support. Null when the report carried none.
export const errorDigest = (log: Pick<IErrorLog, "metadata">): string | null => {
  const digest = log.metadata?.digest;
  return typeof digest === "string" && digest.trim() ? digest.trim() : null;
};

// groupErrors groups by source and message, so the customer app's reports
// would fold into the admin panel's under the same message. They are grouped
// on their own (their keys marked), then every group goes back in the order
// it was last seen, newest first, as groupErrors orders them.
export const groupBoardErrors = (logs: IErrorLog[]): ErrorGroup[] => {
  const customer = logs.filter(isCustomerAppError);
  if (customer.length === 0) return groupErrors(logs);
  const others = groupErrors(logs.filter((log) => !isCustomerAppError(log)));
  const customerGroups = groupErrors(customer).map((group) => ({ ...group, key: `${CUSTOMER_APP}:${group.key}` }));
  return [...others, ...customerGroups].sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));
};
