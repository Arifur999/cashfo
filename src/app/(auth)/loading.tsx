import T from "@/components/shared/T";
import { cn } from "@/lib/utils";

const bar = "block animate-pulse rounded-sm bg-surface-sunken motion-reduce:animate-none";

// Moving between the sign-in pages: the frame (hero, header, legal links)
// stays in the layout, and only the form column waits, drawn as its heading,
// two fields and the button, at sign-in's heights (the page most often
// loaded): 48px fields on a phone and 52px from md, and the 52px button.
export default function AuthLoading() {
  return (
    <div role="status" className="flex flex-col gap-8">
      <span className="sr-only">
        <T>Loading...</T>
      </span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <span className={cn(bar, "h-9 w-3/4")} />
        <span className={cn(bar, "h-4 w-full")} />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-4">
        {[0, 1].map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <span className={cn(bar, "h-3.5 w-20")} />
            <span className={cn(bar, "h-12 w-full rounded-md md:h-13")} />
          </div>
        ))}
        <span className={cn(bar, "mt-2 h-13 w-full rounded-md")} />
      </div>
    </div>
  );
}
