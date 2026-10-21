import type { FeatureKey } from "./features";

// Everything the customer can add, in one list: the top bar's Add menu, the
// phone's + sheet and the search palette all read it, so they never
// disagree on what is offered, the letter that picks it or where it goes.
// Labels are the English strings t() translates; icons are named here and
// drawn by the menus, so this file stays plain data.
export type AddActionKey = "income" | "expense" | "transfer" | "loan" | "savings" | "task" | "vault";

// The transaction drawer's three tabs.
export type AddEntryKind = "INCOME" | "EXPENSE" | "TRANSFER";

// The soft tile each one sits on (a subset of smartly's tones).
export type AddActionTone = "income" | "expense" | "vault" | "loans" | "money" | "habits";

// The glyph on that tile, by what it shows (ADD_ACTION_ICONS draws them).
export type AddActionIcon = "money-in" | "money-out" | "between" | "loan" | "piggy-bank" | "checklist" | "key";

// What picking one does: open the transaction drawer on a tab, go to the
// page where it is added, or open Today's tasks.
export type AddActionRun = { kind: "drawer"; entry: AddEntryKind } | { kind: "page"; href: string } | { kind: "tasks" };

export interface AddAction {
  key: AddActionKey;
  // The letter that picks it while the Add menu is open.
  letter: string;
  label: string;
  hint: string;
  icon: AddActionIcon;
  tone: AddActionTone;
  run: AddActionRun;
  // The block of the menu it sits in: money in and out, money kept aside,
  // everything else.
  block: number;
  // Hidden while this flag is off (Admin > System > Feature flags).
  feature?: FeatureKey;
  // Posts to the open workspace's books, which only its owner or an
  // accountant may do: a staff member isn't offered it.
  workspaceWrite?: boolean;
}

export const ADD_ACTIONS: AddAction[] = [
  { key: "income", letter: "I", label: "Income", hint: "Salary, freelance, any money in", icon: "money-in", tone: "income", block: 0, workspaceWrite: true, run: { kind: "drawer", entry: "INCOME" } },
  { key: "expense", letter: "E", label: "Expense", hint: "Groceries, rent, bills", icon: "money-out", tone: "expense", block: 0, workspaceWrite: true, run: { kind: "drawer", entry: "EXPENSE" } },
  { key: "transfer", letter: "T", label: "Transfer", hint: "Between your wallets", icon: "between", tone: "vault", block: 0, workspaceWrite: true, run: { kind: "drawer", entry: "TRANSFER" } },
  {
    key: "loan",
    letter: "L",
    label: "Loan entry",
    hint: "Gave, took, got back or paid back",
    icon: "loan",
    tone: "loans",
    block: 1,
    feature: "loan_management",
    workspaceWrite: true,
    run: { kind: "page", href: "/loan-management/transactions" },
  },
  { key: "savings", letter: "S", label: "Add to savings", hint: "Put money towards a goal", icon: "piggy-bank", tone: "money", block: 1, workspaceWrite: true, run: { kind: "page", href: "/savings-goals/dashboard" } },
  { key: "task", letter: "D", label: "Task for today", hint: "Goes to Today’s tasks", icon: "checklist", tone: "habits", block: 2, run: { kind: "tasks" } },
  { key: "vault", letter: "P", label: "Login to the vault", hint: "Opens the vault first", icon: "key", tone: "vault", block: 2, run: { kind: "page", href: "/password-manager" } },
];

// Where "Task for today" goes when no tasks panel is on screen to open.
export const TODAY_TASKS_PAGE = "/habit-tracker/todos";

// The ones this customer can use: a feature switched off takes its action
// with it, and a staff member (canManage false) keeps only their own
// task and vault.
export function visibleAddActions(isFeatureOn: (key: FeatureKey) => boolean, actions: AddAction[] = ADD_ACTIONS, canManage = true): AddAction[] {
  return actions.filter((action) => (!action.feature || isFeatureOn(action.feature)) && (canManage || !action.workspaceWrite));
}

// The actions in their blocks, in order, an emptied block left out. `lead`
// comes first, its block with it: the phone sheet leads with Expense, the
// tab its drawer opens on.
export function addActionBlocks(actions: AddAction[], lead?: AddActionKey): AddAction[][] {
  const byBlock = new Map<number, AddAction[]>();
  for (const action of actions) byBlock.set(action.block, [...(byBlock.get(action.block) ?? []), action]);
  const blocks = [...byBlock.entries()].sort(([a], [b]) => a - b).map(([, block]) => block);
  const at = lead ? blocks.findIndex((block) => block.some((action) => action.key === lead)) : -1;
  if (at === -1) return blocks;
  const first = [...blocks[at]].sort((a, b) => Number(b.key === lead) - Number(a.key === lead));
  return [first, ...blocks.filter((_, index) => index !== at)];
}

// The action a key press picks in the open menu ("e" or "E"), if any. Only a
// single character counts, so Enter or Escape never pick anything.
export function addActionForKey(actions: AddAction[], key: string): AddAction | undefined {
  if (key.length !== 1) return undefined;
  const letter = key.toUpperCase();
  return actions.find((action) => action.letter === letter);
}
