import type { Standing } from "@/lib/customer/eventsDisplay";
import type { EventWords } from "./useEventWords";

// Where a person stands, on the People table's chip.
export function standingShort(standing: Standing, { t, money }: EventWords): string {
  switch (standing.kind) {
    case "none":
      return t("No gifts yet");
    case "even":
      return t("Even");
    case "they":
      return t("They gave {amount} more", { amount: money(standing.more) });
    case "you":
      return t("You gave {amount} more", { amount: money(standing.more) });
  }
}

// The same as a sentence, in the person's popup.
export function standingLong(standing: Standing, name: string, { t, money }: EventWords): string {
  switch (standing.kind) {
    case "none":
      return t("No gifts written down between you and {name} yet.", { name });
    case "even":
      return t("You and {name} have given the same, {amount} each.", { name, amount: money(standing.each) });
    case "they":
      return t("{name} has given {amount} more than you so far.", { name, amount: money(standing.more) });
    case "you":
      return t("You have given {amount} more than {name} so far.", { name, amount: money(standing.more) });
  }
}
