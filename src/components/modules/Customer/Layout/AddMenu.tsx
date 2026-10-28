"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useAddActions, WithAddActions } from "./AddActionsProvider";

// N is a letter like any other while typing, or inside an open drawer,
// dialog or menu.
const isBusy = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[role=dialog], [role=alertdialog], [role=menu]") !== null);

// The N keyboard shortcut. design-v4: "New transaction lives on the
// Dashboard and Transactions pages, plus the N keyboard shortcut", so N
// opens the New transaction drawer straight away (on its Expense tab, as
// the pages' button does). The rest of what can be added stays in the
// phone's + sheet and the search palette (Ctrl K). The top bar draws it
// from md up only: a phone has no keyboard to press it on.
export function AddMenu() {
  return (
    <WithAddActions>
      <NewTransactionShortcut />
    </WithAddActions>
  );
}

function NewTransactionShortcut() {
  const { activeBusinessId } = useAuth();
  const { actions, run } = useAddActions();
  // Only for someone who may post to the books (a staff member has no
  // Expense action).
  const expense = actions.find((action) => action.key === "expense");

  useEffect(() => {
    if (!activeBusinessId || !expense) return;
    const onKey = (event: KeyboardEvent) => {
      // Autofill fires keydowns with no key at all.
      if (typeof event.key !== "string") return;
      if (event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat && !isBusy(event.target)) {
        event.preventDefault();
        run(expense);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeBusinessId, expense, run]);

  return null;
}
