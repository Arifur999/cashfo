"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import Card from "@/components/smartly/Card";
import Logo from "@/components/smartly/Logo";
import { CHOOSE_WORKSPACE_ROUTE } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PinCard } from "./PinCard";

interface WorkspaceLockScreenProps {
  businessId: string;
  businessName: string;
  // Only the owner can remove a forgotten PIN.
  isOwner: boolean;
  // Where to go once it opens; without one, the current page reloads.
  next?: string;
  // There is another workspace to open instead: a way out for someone
  // who doesn't know this PIN.
  canChooseAnother?: boolean;
}

// What a PIN-locked workspace shows until its PIN is entered on this
// device: the customer layout renders it in place of the app, and
// /unlock-workspace when a page finds the workspace locked.
export function WorkspaceLockScreen({ businessId, businessName, isOwner, next, canChooseAnother = false }: WorkspaceLockScreenProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [, startTransition] = useTransition();

  function opened() {
    if (next) {
      router.replace(next);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-fresh px-6 py-6 md:px-12 md:py-8">
      <Logo height={40} className="self-start" />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12">
        <Card padding="lg" className="w-110 max-w-full shadow-overlay">
          <PinCard
            businessId={businessId}
            businessName={businessName}
            isOwner={isOwner}
            onOpened={opened}
            cancelLabel={t("Sign out")}
            onCancel={() => startTransition(() => logoutAction())}
          />
        </Card>
        {canChooseAnother && (
          <Link href={CHOOSE_WORKSPACE_ROUTE} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-body font-semibold text-brand-ink hover:underline">
            <LayoutGrid className="size-4.5" aria-hidden="true" />
            {t("Use another workspace")}
          </Link>
        )}
      </div>
    </div>
  );
}
