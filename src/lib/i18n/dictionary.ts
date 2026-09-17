// Merges every feature area's own partial Bangla dictionary into one lookup
// table, keyed by the exact English string t() was called with. Split into
// per-area files (dictionary/*.ts) instead of one flat file so translating
// one feature area never touches another's file -- see each file's own
// entries for that area's pages/components.
import { chromeDictionary } from "./dictionary/chrome";
import { balanceDictionary } from "./dictionary/balance";
import { assetsDictionary } from "./dictionary/assets";
import { savingsGoalsDictionary } from "./dictionary/savings-goals";
import { loanManagementDictionary } from "./dictionary/loan-management";
import { incomeExpenseDictionary } from "./dictionary/income-expense";
import { reportsDictionary } from "./dictionary/reports";
import { personalDictionary } from "./dictionary/personal";

export const bnDictionary: Record<string, string> = {
  ...chromeDictionary,
  ...balanceDictionary,
  ...assetsDictionary,
  ...savingsGoalsDictionary,
  ...loanManagementDictionary,
  ...incomeExpenseDictionary,
  ...reportsDictionary,
  ...personalDictionary,
};
