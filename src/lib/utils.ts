// The shadcn CLI generates every primitive in components/ui/ importing `cn`
// from the "cn" package, and app code goes through this module -- both
// resolve to lib/cn.ts (see the "cn" path in tsconfig.json), which knows
// the design's text styles, shadows and gradients.
export { cn } from "./cn";
