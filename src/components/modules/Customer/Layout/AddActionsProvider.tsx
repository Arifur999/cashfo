"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard, KeyRound, ListChecks, type LucideProps, PiggyBank } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { usePlatform } from "@/components/modules/Customer/Providers/PlatformProvider";
import { TransactionDrawer, type EntryKind } from "@/components/modules/Customer/QuickEntry/TransactionDrawer";
import { TODAY_TASKS_PAGE, visibleAddActions, type AddAction, type AddActionIcon } from "@/lib/customer/addActions";
import { isFeatureOn } from "@/lib/customer/features";

export const ADD_ACTION_ICONS: Record<AddActionIcon, React.ComponentType<LucideProps>> = {
  "money-in": ArrowUpRight,
  "money-out": ArrowDownLeft,
  between: ArrowLeftRight,
  loan: CreditCard,
  "piggy-bank": PiggyBank,
  checklist: ListChecks,
  key: KeyRound,
};

interface AddActionsValue {
  // What this customer can add (lib/customer/addActions.ts, flags applied).
  actions: AddAction[];
  run: (action: AddAction) => void;
  // Today's tasks panel, which "Task for today" opens. The top bar draws it
  // and says so through attachTasksPanel; with no panel attached, the
  // action goes to the to-do page instead.
  tasksOpen: boolean;
  setTasksOpen: (open: boolean) => void;
  attachTasksPanel: () => () => void;
}

const AddActionsContext = createContext<AddActionsValue | null>(null);

// One home for everything Add does, around the top bar, the page and the
// phone's +: the Add menu, the phone sheet and the search palette all run
// their picks through it, so there is one New transaction drawer however
// it was opened.
export function AddActionsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeBusinessId, activeBusiness } = useAuth();
  const { flags } = usePlatform();
  const [drawer, setDrawer] = useState<EntryKind | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  // How many tasks panels are on screen (a count, not state: nothing
  // renders from it).
  const panels = useRef(0);

  // Nothing can be added without an open workspace to add it to, and a
  // staff member can't post to its books.
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const actions = useMemo(() => (activeBusinessId ? visibleAddActions((key) => isFeatureOn(flags, key), undefined, canManage) : []), [activeBusinessId, flags, canManage]);

  const run = useCallback(
    (action: AddAction) => {
      const what = action.run;
      if (what.kind === "drawer") setDrawer(what.entry);
      else if (what.kind === "page") router.push(what.href);
      else if (panels.current > 0) setTasksOpen(true);
      else router.push(TODAY_TASKS_PAGE);
    },
    [router],
  );

  const attachTasksPanel = useCallback(() => {
    panels.current += 1;
    return () => {
      panels.current -= 1;
    };
  }, []);

  const value = useMemo(() => ({ actions, run, tasksOpen, setTasksOpen, attachTasksPanel }), [actions, run, tasksOpen, attachTasksPanel]);

  return (
    <AddActionsContext value={value}>
      {children}
      {activeBusinessId && (
        <TransactionDrawer open={drawer !== null} initialKind={drawer ?? "EXPENSE"} onClose={() => setDrawer(null)} businessId={activeBusinessId} currency={activeBusiness?.currency ?? "BDT"} />
      )}
    </AddActionsContext>
  );
}

// Its children inside the shell's AddActionsProvider, or inside one of
// their own when the shell has none (they then keep a drawer of their own,
// as each did before there was one to share).
export function WithAddActions({ children }: { children: React.ReactNode }) {
  return useContext(AddActionsContext) ? children : <AddActionsProvider>{children}</AddActionsProvider>;
}

export function useAddActions(): AddActionsValue {
  const value = useContext(AddActionsContext);
  if (!value) {
    throw new Error("useAddActions() must be called within an AddActionsProvider (wrap the component in <WithAddActions>)");
  }
  return value;
}
