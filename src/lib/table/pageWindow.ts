export type PageWindowItem = number | "ellipsis-start" | "ellipsis-end";

// The page buttons DataTablePagination renders: a fixed 7-slot window that
// always shows the first and last page and the current page's neighbours,
// collapsing the rest into ellipses (which jump 5 pages when clicked).
// Fixed width means the buttons never shift under the cursor while paging.
export const getPageWindow = (currentPage: number, totalPages: number): PageWindowItem[] => {
  const SLOTS = 7;

  if (totalPages <= SLOTS) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
};

export const ELLIPSIS_JUMP = 5;
