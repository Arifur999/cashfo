// The "When" choices the admin lists offer (audit log, sign-ins, errors).
// The API resolves them: today starts at Dhaka midnight, the others roll
// back from now, and "all" is any time.
export const WHEN_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "Any time" },
];
