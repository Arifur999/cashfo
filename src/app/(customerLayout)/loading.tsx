import RouteLoading from "@/components/shared/RouteLoading";

// Every customer page renders on the server; this shows while it does, so a
// click is answered at once instead of the old page sitting there.
export default function CustomerLoading() {
  return <RouteLoading label="Loading..." />;
}
