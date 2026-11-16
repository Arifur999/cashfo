// A form dialog opens with its first field focused, as the boards show it,
// instead of Radix's default: the close button, drawn with its focus ring.
// Passed as onOpenAutoFocus; without a field Radix keeps its default.
export const focusFirstField = (event: Event) => {
  const first = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea:not([disabled])");
  if (first) {
    event.preventDefault();
    first.focus();
  }
};
