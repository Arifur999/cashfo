"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import type { UserBusiness } from "@/lib/customer/api";
import { switchWorkspaceAction } from "@/lib/customer/businessActions";
import { orderWorkspaces, switchableWorkspaces, workspaceName } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PinPromptModal } from "./PinPromptModal";
import { useReturnFocus } from "./useReturnFocus";

interface WorkspaceSwitchOptions {
  // Where a switch lands: "auto" works it out from this page
  // (landingAfterSwitch: a record goes to its list, Books go home outside a
  // business), "stay" keeps this very page (the Books notice), "home" goes
  // to Home (Settings › Workspaces).
  land?: "auto" | "stay" | "home";
  // Once a switch went through: a menu or the drawer closes itself.
  onSwitched?: () => void;
  // Where the focus goes when the PIN dialog closes if the row it was
  // opened from is gone by then (the account menu closes for the dialog).
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export interface WorkspaceSwitch {
  // Personal first, then the rest A to Z; never a group.
  workspaces: UserBusiness[];
  activeBusinessId: string | null;
  // The workspace being opened, until the layout reports it open.
  pendingId: string | null;
  busy: boolean;
  nameOf: (business: UserBusiness) => string;
  // Has a PIN this device hasn't entered (or its 12 hours ran out).
  isLocked: (business: UserBusiness) => boolean;
  choose: (business: UserBusiness) => void;
  // The PIN dialog: render it once, outside any menu or drawer content, so
  // it outlives them.
  pinPrompt: ReactNode;
  prompting: boolean;
}

// Switching workspaces, shared by the account menu, the phone drawer, the
// Books notice and Settings › Workspaces. A locked workspace asks for its
// PIN first. The server checks the id and remembers the choice; the page
// then moves to where the switch lands and refreshes, so everything on
// screen reads the new workspace.
export function useWorkspaceSwitch({ land = "auto", onSwitched, returnFocusRef }: WorkspaceSwitchOptions = {}): WorkspaceSwitch {
  const { user, activeBusinessId, unlockedBusinessIds } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<UserBusiness | null>(null);
  const returnFocus = useReturnFocus(returnFocusRef);

  // The refresh after a switch brings the new active id; from then on
  // nothing is pending (React's render-time reset, not an effect).
  const [seenActiveId, setSeenActiveId] = useState(activeBusinessId);
  if (seenActiveId !== activeBusinessId) {
    setSeenActiveId(activeBusinessId);
    setRequestedId(null);
  }

  const workspaces = orderWorkspaces(switchableWorkspaces(user.businesses));
  const nameOf = (business: UserBusiness) => workspaceName(business, user.name);
  const isLocked = (business: UserBusiness) => business.hasPinLock && !unlockedBusinessIds.includes(business.id);
  const busy = isPending || requestedId !== null;

  // choose() can run long after the render that made it -- "Open it now" in
  // a toast, after the refresh that brought the new workspace's unlock --
  // so it reads the latest of these rather than its own render's.
  const latest = useRef({ activeBusinessId, unlockedBusinessIds, busy });
  useEffect(() => {
    latest.current = { activeBusinessId, unlockedBusinessIds, busy };
  });

  function open(business: UserBusiness) {
    const query = searchParams.toString();
    const from = land === "home" ? undefined : `${pathname}${query ? `?${query}` : ""}`;
    setRequestedId(business.id);
    startTransition(async () => {
      const result = await switchWorkspaceAction(business.id, from);
      if (!result.success || !result.data) {
        setRequestedId(null);
        toast.error(t(result.message ?? "Couldn't open that workspace. Please try again."));
        return;
      }
      toast.success(t("Switched to {name}", { name: nameOf(business) }));
      onSwitched?.();
      if (land !== "stay") router.push(result.data.landing);
      router.refresh();
    });
  }

  function choose(business: UserBusiness) {
    const now = latest.current;
    if (now.busy || business.id === now.activeBusinessId) return;
    if (business.hasPinLock && !now.unlockedBusinessIds.includes(business.id)) {
      returnFocus.remember();
      setPinFor(business);
      return;
    }
    open(business);
  }

  const pinPrompt = pinFor ? (
    <PinPromptModal
      open
      onClose={() => setPinFor(null)}
      businessId={pinFor.id}
      businessName={nameOf(pinFor)}
      isOwner={pinFor.role === "OWNER"}
      onVerified={() => open(pinFor)}
      onCloseAutoFocus={returnFocus.onCloseAutoFocus}
    />
  ) : null;

  return { workspaces, activeBusinessId, pendingId: requestedId, busy, nameOf, isLocked, choose, pinPrompt, prompting: pinFor !== null };
}
