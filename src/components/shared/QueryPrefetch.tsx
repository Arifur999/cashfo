import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

interface QueryPrefetchProps {
  // e.g. (client) => client.prefetchQuery(workspaceOverviewQuery(queryString))
  // -- the same queryOptions the client components below pass to useQuery.
  // A callback (not an options array) keeps each query fully typed.
  prefetch: (queryClient: QueryClient) => Promise<unknown>;
  children: React.ReactNode;
}

// Server Component: prefetches on the server and hydrates the client cache,
// so the client tables below render with data on first paint instead of a
// loading state -- the "Server Component prefetches, Client Component
// consumes" rule, written once instead of per page.
const QueryPrefetch = async ({ prefetch, children }: QueryPrefetchProps) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  await prefetch(queryClient);

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
};

export default QueryPrefetch;
