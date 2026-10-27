"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// The Settings boards' switch: a 42 × 24 track (the field edge's grey when
// off, the emerald when on) with an 18px white thumb 3px in from its end.
// Its hit area reaches past the track, so a finger finds it.
export function SettingSwitch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "group/sw relative inline-flex h-6 w-10.5 shrink-0 items-center rounded-full p-0.75 transition-colors outline-none after:absolute after:-inset-x-2 after:-inset-y-2.5 focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[state=checked]:bg-emerald data-[state=unchecked]:bg-input disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4.5 rounded-full bg-white shadow-[0_1px_2px_rgba(18,32,29,0.2)] transition-transform motion-reduce:transition-none data-[state=checked]:translate-x-4.5" />
    </SwitchPrimitive.Root>
  );
}
