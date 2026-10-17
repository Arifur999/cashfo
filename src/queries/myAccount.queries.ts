import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getMyAccount, getMySessions, getMySignIns } from "@/services/myAccount.services";

const { all } = queryKeys.myAccount;

export const myAccountQuery = () =>
  queryOptions({
    queryKey: [...all, "me"] as const,
    queryFn: () => getMyAccount(),
  });

export const mySessionsQuery = () =>
  queryOptions({
    queryKey: [...all, "sessions"] as const,
    queryFn: () => getMySessions(),
  });

export const mySignInsQuery = () =>
  queryOptions({
    queryKey: [...all, "sign-ins"] as const,
    queryFn: () => getMySignIns(),
  });
