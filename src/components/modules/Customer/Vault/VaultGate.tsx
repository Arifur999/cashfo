import Card from "@/components/smartly/Card";
import { cn } from "@/lib/utils";

interface VaultGateProps {
  children: React.ReactNode;
  className?: string;
}

// Where the vault's locked forms stand (design-v4 VaultLock, VaultSetup,
// VaultReset): on the page itself, the form and its side note centred
// side by side, 24px apart, stacked on a phone.
export function VaultGate({ children, className }: VaultGateProps) {
  return <div className={cn("flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center", className)}>{children}</div>;
}

// The card a form sits in: 460px (the unlock form 440), 28px in.
export function GateCard({ children, className, ...props }: React.ComponentProps<"section">) {
  return (
    <Card asChild padding="none">
      <section className={cn("flex w-full max-w-115 flex-col gap-4 px-5 py-6 sm:px-7 sm:py-6.5", className)} {...props}>
        {children}
      </section>
    </Card>
  );
}

// The side note beside a form: 340px, 22px in.
export function GateAside({ children, className, ...props }: React.ComponentProps<"aside">) {
  return (
    <Card asChild padding="none">
      <aside className={cn("flex w-full max-w-115 flex-col gap-3.5 p-5.5 lg:w-85", className)} {...props}>
        {children}
      </aside>
    </Card>
  );
}
