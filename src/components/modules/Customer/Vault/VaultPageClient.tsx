"use client";

import { Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import StatePanel from "@/components/smartly/StatePanel";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { listVaultEntriesAction } from "@/lib/customer/passwordVaultActions";
import { draftFor, isLockedMessage, parseExpiry, settle } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { VaultGate } from "./VaultGate";
import { VaultHome, type DrawerState, type VaultLoad } from "./VaultHome";
import { VaultPasswordForm, type VaultPasswordMode } from "./VaultPasswordForm";
import { VaultUnlockForm } from "./VaultUnlockForm";
import { dropQuery, openStep, unwindSteps, VAULT_STEPS } from "./vaultSteps";

interface VaultPageClientProps {
  // null when the status couldn't be read: the unlock form then, whose
  // "Forgot vault password?" covers a vault never set up too, and an unlock
  // answered "set one up first" moves on to the set-up form.
  hasVaultPassword: boolean | null;
  // How many logins it holds, when known.
  entryCount?: number;
  // false for a Google-only account, which has no account password to give.
  hasAccountPassword?: boolean;
  // A super admin's read-only support view, which the API refuses to unlock.
  readOnly?: boolean;
}

type Mode = "unlock" | VaultPasswordMode | "open";

interface Session {
  token: string;
  expiresAt: number;
}

// How long before the lock the page says so, while there is time to save.
const WARN_BEFORE_MS = 60_000;

// Vault › Password vault. The unlocked token lives only here, in React
// state, so leaving the page locks the vault. So does the drawer's draft:
// in memory, never stored, and kept through a lock for the next unlock.
export function VaultPageClient({ hasVaultPassword, entryCount, hasAccountPassword, readOnly = false }: VaultPageClientProps) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(hasVaultPassword === false ? "setup" : "unlock");
  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<VaultEntrySummary[]>([]);
  const [load, setLoad] = useState<VaultLoad>("loading");
  // For a reset's warning: the page's count, then the list's as last seen.
  const [count, setCount] = useState(entryCount);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  // The token the answers on their way belong to; a lock in between drops them.
  const live = useRef<string | null>(null);
  // The session whose last minute was already announced.
  const warned = useRef<number | null>(null);

  // "Save a login" from the Add menu or the search palette comes as
  // ?new=1: the drawer opens once the vault is open (straight away when it
  // already is), then the flag leaves the address so the next press works.
  const askedToAdd = searchParams.get("new") === "1";
  const [addTaken, setAddTaken] = useState(false);
  if (askedToAdd && !addTaken && mode === "open") {
    setAddTaken(true);
    // A login being typed (or kept through a lock) wins over a blank one.
    if (!drawer?.open) setDrawer({ open: true, draft: draftFor(null, null, t) });
  }
  if (!askedToAdd && addTaken) setAddTaken(false);

  // The open drawer is a step in the address too (?entry=new, or the id of
  // the login being edited), so Back closes it instead of leaving the page
  // and locking the vault. Back taking the step off closes the drawer, its
  // fields kept for the closing slide; mirrored, as Next catches up with
  // pushState a moment later. A lock takes the step off as well, and then
  // the drawer stays open for the next unlock.
  const urlEntry = searchParams.get("entry");
  const [seenUrlEntry, setSeenUrlEntry] = useState(urlEntry);
  if (urlEntry !== seenUrlEntry) {
    setSeenUrlEntry(urlEntry);
    if (urlEntry === null && mode === "open" && !askedToAdd && drawer?.open) setDrawer({ ...drawer, open: false });
  }

  // The step goes on whenever the drawer opens: from the page, from ?new=1,
  // or kept through a lock. The flag leaves the address first, so Back from
  // the drawer can't bring it back and open the drawer again.
  const drawerStep = drawer?.open ? (drawer.draft.editing?.id ?? "new") : null;
  useEffect(() => {
    if (mode !== "open") return;
    if (addTaken) dropQuery("new");
    if (drawerStep) openStep("entry", drawerStep);
  }, [mode, addTaken, drawerStep]);

  // The steps belong to the open vault: locked, the address goes back to
  // the page's own entry, so Back from the lock screen leaves the page and
  // the next unlock starts on the list.
  const stepInAddress = VAULT_STEPS.some((name) => searchParams.has(name));
  useEffect(() => {
    if (mode !== "open" && stepInAddress) unwindSteps();
  }, [mode, stepInAddress]);

  function lock(message?: string) {
    live.current = null;
    if (load === "ready") setCount(entries.length);
    setSession(null);
    setEntries([]);
    setLoad("loading");
    // What was being typed stays and opens again after the next unlock.
    setDrawer((current) => (current?.open ? { open: true, draft: { ...current.draft, kept: true } } : null));
    setMode("unlock");
    if (message) toast(message);
  }

  // Checked against the clock every second, so a phone woken from sleep
  // locks at once; nothing is drawn again until the warning or the lock
  // (the countdown on screen ticks on its own).
  const expire = useEffectEvent(() => lock(t("The vault locked itself after 10 minutes.")));
  const warn = useEffectEvent(() => toast.warning(t(drawer?.open ? "The vault locks in 1 minute. Save what you're editing." : "The vault locks in 1 minute.")));
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      const left = session.expiresAt - Date.now();
      if (left <= 0) {
        expire();
      } else if (left <= WARN_BEFORE_MS && warned.current !== session.expiresAt) {
        warned.current = session.expiresAt;
        warn();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  // The vault counts as empty only once an answer says so; one that never
  // came shows an error with Try again.
  function loadEntries(token: string) {
    setLoad("loading");
    void settle(listVaultEntriesAction(token)).then((result) => {
      if (live.current !== token) return;
      if (result.success && result.data) {
        setEntries(result.data);
        setLoad("ready");
      } else if (isLockedMessage(result.message)) {
        lock(t("The vault session ended. Unlock it again."));
      } else {
        setLoad("failed");
      }
    });
  }

  function unlocked(token: string, expiresIn: string) {
    live.current = token;
    setSession({ token, expiresAt: Date.now() + parseExpiry(expiresIn) });
    setMode("open");
    loadEntries(token);
  }

  // A reset empties the vault: a login being edited went with it, though a
  // new one being typed can still be saved.
  function passwordSet(formMode: VaultPasswordMode) {
    if (formMode !== "reset") return;
    setCount(0);
    setDrawer((current) => (current && !current.draft.editing ? current : null));
  }

  const header = (
    <>
      {/* Phones name the page in the top bar, so the heading is for screen readers there. */}
      <h1 className="sr-only md:hidden">{t("Password vault")}</h1>
      <PageHeader className="max-md:hidden" eyebrow={t("Vault")} tone="vault" title={t("Password vault")} description={t("Logins for your other accounts: Facebook, bank, email and more.")} />
    </>
  );

  // Every unlock, set-up or reset would be refused here: say so instead.
  if (readOnly) {
    return (
      <PageFrame className="gap-6 max-md:pt-4">
        {header}
        <StatePanel icon={<Lock />} tone="vault" title={t("The vault stays locked in a support view")} description={t("It holds the customer's passwords for other sites, so only they can open it, with their own vault password.")} />
      </PageFrame>
    );
  }

  if (mode === "open" && session) {
    return (
      <VaultHome
        token={session.token}
        entries={entries}
        load={load}
        onRetry={() => loadEntries(session.token)}
        expiresAt={session.expiresAt}
        // An answer that lands after a lock changes nothing.
        onEntries={(update) => {
          if (live.current) setEntries(update);
        }}
        onLock={() => lock()}
        onLocked={() => lock(t("The vault session ended. Unlock it again."))}
        drawer={drawer}
        onDrawer={setDrawer}
      />
    );
  }

  const formMode: VaultPasswordMode | null = mode === "setup" || mode === "change" || mode === "reset" ? mode : null;

  return (
    <PageFrame className="gap-6 max-md:pt-4">
      {header}
      <VaultGate>
        {formMode ? (
          <VaultPasswordForm
            key={formMode}
            mode={formMode}
            entryCount={count}
            hasAccountPassword={hasAccountPassword}
            onUnlocked={(token, expiresIn) => {
              passwordSet(formMode);
              unlocked(token, expiresIn);
            }}
            onDone={() => {
              passwordSet(formMode);
              setMode("unlock");
            }}
            onBack={() => setMode("unlock")}
          />
        ) : (
          <VaultUnlockForm onUnlocked={unlocked} onForgot={() => setMode("reset")} onChange={() => setMode("change")} onNoVault={() => setMode("setup")} />
        )}
      </VaultGate>
    </PageFrame>
  );
}
