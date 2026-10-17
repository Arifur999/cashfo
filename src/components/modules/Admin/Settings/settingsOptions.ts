import type { SelectOption } from "@/components/shared/form/AppSelectField";

// The currencies and time zones the platform is likely to start a workspace
// in. A value saved before (any 3-letter code or IANA zone the API took)
// still shows, added to the end.
export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: "BDT", label: "BDT · Bangladeshi taka (৳)" },
  { value: "USD", label: "USD · US dollar ($)" },
  { value: "EUR", label: "EUR · Euro (€)" },
  { value: "GBP", label: "GBP · British pound (£)" },
  { value: "INR", label: "INR · Indian rupee (₹)" },
];

export const TIME_ZONE_OPTIONS: SelectOption[] = [
  { value: "Asia/Dhaka", label: "Asia/Dhaka · GMT+6" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata · GMT+5:30" },
  { value: "Asia/Dubai", label: "Asia/Dubai · GMT+4" },
  { value: "Asia/Singapore", label: "Asia/Singapore · GMT+8" },
  { value: "UTC", label: "UTC · GMT+0" },
];

export const withCurrent = (options: SelectOption[], current: string): SelectOption[] =>
  !current || options.some((option) => option.value === current) ? options : [...options, { value: current, label: current }];
