import { TICKET_STATUSES, type TicketStatus } from "@/types/ticket.types";
import { CLOSING_STATUSES } from "./ticketStatusCopy";

// What the reply box sets a ticket to once a reply has gone. Most replies
// hand the ticket back to the user, so that is where it starts; the
// admin's own last everyday choice is remembered in this browser (a
// per-viewer convenience). Resolving or closing is decided per ticket, so
// it is never remembered.

// Radix Select reserves "" for "no value", so "leave it" needs a token.
export const KEEP_STATUS = "keep";

export type AfterSendChoice = typeof KEEP_STATUS | TicketStatus;

export const DEFAULT_AFTER_SEND: AfterSendChoice = "WAITING_ON_USER";

const STORAGE_KEY = "admin:ticket-after-send";
const CHANGE_EVENT = "admin:ticket-after-send";

export const isAfterSendChoice = (value: string | null): value is AfterSendChoice =>
  value === KEEP_STATUS || (TICKET_STATUSES as readonly string[]).includes(value ?? "");

// A remembered choice, or the default: never a closing one, and never
// something an older version of this page stored that no longer exists.
export const rememberedChoice = (stored: string | null): AfterSendChoice =>
  isAfterSendChoice(stored) && !(stored !== KEEP_STATUS && CLOSING_STATUSES[stored]) ? stored : DEFAULT_AFTER_SEND;

// Where the box starts on this ticket. A reply to a solved or closed one
// (a closing "thanks") shouldn't reopen it unless the admin says so.
export const initialAfterSend = (remembered: AfterSendChoice, current: TicketStatus): AfterSendChoice =>
  current === "RESOLVED" || current === "CLOSED" ? KEEP_STATUS : remembered;

// The status to set once the reply is away, or null when nothing changes.
export const statusToSet = (choice: AfterSendChoice, current: TicketStatus): TicketStatus | null =>
  choice === KEEP_STATUS || choice === current ? null : choice;

export const readAfterSendChoice = (): AfterSendChoice => {
  try {
    return rememberedChoice(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_AFTER_SEND;
  }
};

export const saveAfterSendChoice = (choice: AfterSendChoice) => {
  if (choice !== KEEP_STATUS && CLOSING_STATUSES[choice]) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const subscribeAfterSendChoice = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};
