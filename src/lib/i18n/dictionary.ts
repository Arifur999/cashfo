// Merges every feature area's own partial Bangla dictionary into one lookup
// table, keyed by the exact English string t() was called with. Split into
// per-area files (dictionary/*.ts) instead of one flat file so translating
// one feature area never touches another's file -- see each file's own
// entries for that area's pages/components.
import { sharedDictionary } from "./dictionary/shared";
import { chromeDictionary } from "./dictionary/chrome";
import { dashboardDictionary } from "./dictionary/dashboard";
import { balanceDictionary } from "./dictionary/balance";
import { assetsDictionary } from "./dictionary/assets";
import { savingsGoalsDictionary } from "./dictionary/savings-goals";
import { loanManagementDictionary } from "./dictionary/loan-management";
import { incomeExpenseDictionary } from "./dictionary/income-expense";
import { reportsDictionary } from "./dictionary/reports";
import { personalDictionary } from "./dictionary/personal";
import { settingsWorkspaceDictionary } from "./dictionary/settings-workspace";
import { groupExpensesDictionary } from "./dictionary/group-expenses";

export const bnDictionary: Record<string, string> = {
  ...chromeDictionary,
  ...dashboardDictionary,
  ...balanceDictionary,
  ...assetsDictionary,
  ...savingsGoalsDictionary,
  ...loanManagementDictionary,
  ...incomeExpenseDictionary,
  ...reportsDictionary,
  ...personalDictionary,
  ...settingsWorkspaceDictionary,
  ...groupExpensesDictionary,
  // Spread last so a shared word (see that file's own comment) always wins
  // over an area accidentally redefining it with different wording.
  ...sharedDictionary,
};
