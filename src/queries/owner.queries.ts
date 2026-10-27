import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getOwnerNotes, getOwners } from "@/services/owner.services";

export const ownersListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.owners.list(queryString),
    queryFn: () => getOwners(queryString),
  });

// A person's "Notes for admins", under their record so a change to them
// (suspend, a note added) refreshes these too.
export const ownerNotesQuery = (userId: string) =>
  queryOptions({
    queryKey: [...queryKeys.owners.detail(userId), "notes"] as const,
    queryFn: () => getOwnerNotes(userId),
  });
