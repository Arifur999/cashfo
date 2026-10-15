"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { listVaultEntriesAction } from "@/lib/customer/passwordVaultActions";
import { parseExpiry } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { VaultGate } from "./VaultGate";
import { VaultHome } from "./VaultHome";
import { VaultPasswordForm, type VaultPasswordMode } from "./VaultPasswordForm";
import { VaultUnlockForm } from "./VaultUnlockForm";

interface VaultPageClientProps {
  hasVaultPassword: boolean;
}

type Mode = "unlock" | VaultPasswordMode | "open";

interface Session {
  token: string;
  expiresAt: number;
}

// A vault session expiring mid-use, ended by a password change or reset, or
// being locked reads the same to the user: back to the unlock form.
export const isLockedMessage = (message: string | undefined): boolean => !!message && /unlock|locked|expired|vault token/i.test(message);

// Security › Password vault. The unlocked token lives only here, in React
// state, so leaving the page locks the vault.
export function VaultPageClient({ hasVaultPassword }: VaultPageClientProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>(hasVaultPassword ? "unlock" : "setup");
  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<VaultEntrySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // The countdown while the vault is open, and the lock when the token's
  // time is up.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      if (Date.now() >= session.expiresAt) {
        setSession(null);
        setEntries([]);
        setMode("unlock");
        toast(t("The vault locked itself after 10 minutes."));
      } else {
        setNow(Date.now());
      }
    }, 1000);
    return () => clearInterval(id);
  }, [session, t]);

  function lock(message?: string) {
    setSession(null);
    setEntries([]);
    setMode("unlock");
    if (message) toast(message);
  }

  const msLeft = session ? Math.max(0, session.expiresAt - now) : 0;

  function load(token: string) {
    setLoading(true);
    listVaultEntriesAction(token).then((result) => {
      setLoading(false);
      if (result.success && result.data) setEntries(result.data);
      else if (isLockedMessage(result.message)) lock(t("The vault session ended. Unlock it again."));
      else toast.error(result.message ?? t("Failed to load vault entries"));
    });
  }

  function unlocked(token: string, expiresIn: string) {
    setSession({ token, expiresAt: Date.now() + parseExpiry(expiresIn) });
    setNow(Date.now());
    setMode("open");
    load(token);
  }

  if (mode === "open" && session) {
    return <VaultHome token={session.token} entries={entries} loading={loading} msLeft={msLeft} onEntries={setEntries} onLock={() => lock()} onLocked={() => lock(t("The vault session ended. Unlock it again."))} />;
  }

  const formMode: VaultPasswordMode | null = mode === "setup" || mode === "change" || mode === "reset" ? mode : null;

  return (
    <PageFrame className="gap-6">
      <PageHeader eyebrow={t("Security")} tone="vault" title={t("Password vault")} description={t("Logins for your other accounts: Facebook, bank, email and more.")} />
      <VaultGate>{formMode ? <VaultPasswordForm mode={formMode} onDone={() => setMode("unlock")} onBack={() => setMode("unlock")} /> : <VaultUnlockForm onUnlocked={unlocked} onForgot={() => setMode("reset")} onChange={() => setMode("change")} />}</VaultGate>
    </PageFrame>
  );
}
