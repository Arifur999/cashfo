import { cn } from "@/lib/utils";
import { LIST_FOOTER } from "./recipes";

// The strip under a list: Pagination, LoadMore or a note ("Showing the
// newest 1,000"). Hand it to ListCard's footer so it sits outside the table.
const ListFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-slot="list-footer" className={cn(LIST_FOOTER, "flex flex-col gap-2", className)} {...props} />
);

export default ListFooter;
