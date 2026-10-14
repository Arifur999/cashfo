"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard, KeyRound, ListChecks, PiggyBank, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { AddTransactionModal } from "@/components/modules/Customer/QuickEntry/AddTransactionModal";
import { TransferModal } from "@/components/modules/Customer/QuickEntry/TransferModal";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import Kbd from "@/components/smartly/Kbd";
import type { Tone } from "@/components/smartly/tones";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Choice = "income" | "expense" | "transfer" | "loan" | "savings" | "task" | "vault";

interface Row {
  choice: Choice;
  key: string;
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  text: string;
}

const ROWS: Row[][] = [
  [
    { choice: "income", key: "I", icon: <ArrowUpRight />, tone: "income", title: "Income", text: "Salary, freelance, any money in" },
    { choice: "expense", key: "E", icon: <ArrowDownLeft />, tone: "expense", title: "Expense", text: "Groceries, rent, bills" },
    { choice: "transfer", key: "T", icon: <ArrowLeftRight />, tone: "vault", title: "Transfer", text: "Between your wallets" },
  ],
  [
    { choice: "loan", key: "L", icon: <CreditCard />, tone: "loans", title: "Loan entry", text: "Gave, took, got back or paid back" },
    { choice: "savings", key: "S", icon: <PiggyBank />, tone: "money", title: "Add to savings", text: "Put money towards a goal" },
  ],
  [
    { choice: "task", key: "D", icon: <ListChecks />, tone: "habits", title: "Task for today", text: "Goes to Today's tasks" },
    { choice: "vault", key: "P", icon: <KeyRound />, tone: "vault", title: "Login to the vault", text: "Opens the vault first" },
  ],
];

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

interface AddMenuProps {
  // Opens the Today's tasks panel.
  onAddTask: () => void;
}

// The top bar's Add button: one menu for everything you can add. N opens
// it anywhere; the letter on each row picks it.
export function AddMenu({ onAddTask }: AddMenuProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { activeBusinessId, activeBusiness } = useAuth();
  const loansOn = useFeature("loan_management");
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"income" | "expense" | "transfer" | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = ROWS.map((group) => group.filter((row) => row.choice !== "loan" || loansOn)).filter((group) => group.length > 0);

  function choose(choice: Choice) {
    setOpen(false);
    switch (choice) {
      case "income":
      case "expense":
      case "transfer":
        setModal(choice);
        break;
      case "loan":
        router.push("/loan-management/transactions");
        break;
      case "savings":
        router.push("/savings-goals/dashboard");
        break;
      case "task":
        onAddTask();
        break;
      case "vault":
        router.push("/password-manager");
        break;
    }
  }

  function onMenuKeyDown(event: React.KeyboardEvent) {
    const row = rows.flat().find((r) => r.key.toLowerCase() === event.key.toLowerCase());
    if (row) {
      event.preventDefault();
      choose(row.choice);
    }
  }

  if (!activeBusinessId) return null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="soft" className="pl-3">
            <Plus strokeWidth={2.25} />
            {t("Add")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} onKeyDown={onMenuKeyDown} className="w-85 rounded-lg border border-line bg-surface p-0 shadow-overlay ring-0">
          <div className="p-2">
            {rows.map((group, index) => (
              <div key={index}>
                {index > 0 && <DropdownMenuSeparator className="mx-3 my-2 bg-line" />}
                {group.map((row) => (
                  <DropdownMenuItem key={row.choice} onSelect={() => choose(row.choice)} className="cursor-pointer gap-3 rounded-md px-3 py-2 focus:bg-cream">
                    <IconTile tone={row.tone} size={36}>
                      {row.icon}
                    </IconTile>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-semibold text-ink">{t(row.title)}</span>
                      <span className="text-caption font-normal text-ink-muted">{t(row.text)}</span>
                    </span>
                    <Kbd>{row.key}</Kbd>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-line bg-cream px-4 py-3 text-caption font-normal text-ink-muted">
            {t("Press N anywhere to open this menu").split("N").length === 2 ? (
              <>
                {t("Press N anywhere to open this menu").split("N")[0]}
                <Kbd className="px-1 py-0">N</Kbd>
                {t("Press N anywhere to open this menu").split("N")[1]}
              </>
            ) : (
              t("Press N anywhere to open this menu")
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddTransactionModal
        open={modal === "income" || modal === "expense"}
        initialKind={modal === "income" ? "INCOME" : "EXPENSE"}
        onClose={() => setModal(null)}
        businessId={activeBusinessId}
        currency={activeBusiness?.currency ?? "BDT"}
      />
      <TransferModal open={modal === "transfer"} onClose={() => setModal(null)} businessId={activeBusinessId} />
    </>
  );
}
