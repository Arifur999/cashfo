import { dehydrate, HydrationBoundary, QueryClient, type FetchQueryOptions } from "@tanstack/react-query";

interface QueryPrefetchProps {
  // Same keys/queryFns the client components below use with useQuery.
  queries: FetchQueryOptions[];
  children: React.ReactNode;
}

// Server Component: prefetches on the server and hydrates the client cache,
// so the client tables below render with data on first paint instead of a
// loading state -- the "Server Component prefetches, Client Component
// consumes" rule, written once instead of per page.
const QueryPrefetch = async ({ queries, children }: QueryPrefetchProps) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  await Promise.all(queries.map((query) => queryClient.prefetchQuery(query)));

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
};

export default QueryPrefetch;
