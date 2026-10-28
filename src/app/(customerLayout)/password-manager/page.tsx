import { redirect } from "next/navigation";
import { VaultPageClient } from "@/components/modules/Customer/Vault/VaultPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getVaultStatus } from "@/lib/customer/vault";

export const generateMetadata = () => customerPageMetadata("/password-manager");

// Vault › Password Manager. Whether a vault password exists is readable with
// the session alone; everything else needs the vault unlocked. A status
// that couldn't be read is passed on as unknown (null), never as "no vault":
// that would offer a set-up form to someone who has one.
export default async function PasswordManagerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const status = await getVaultStatus();
  return (
    <VaultPageClient
      hasVaultPassword={status?.hasVaultPassword ?? null}
      entryCount={status?.entryCount}
      hasAccountPassword={status?.hasAccountPassword ?? user.hasPassword}
      lockMinutes={status?.lockMinutes ?? null}
      effectiveMinutes={status?.effectiveMinutes}
      triesLeft={status?.triesLeft}
      retryAfterSec={status?.retryAfterSec}
      userName={user.name}
      readOnly={Boolean(user.impersonatedBy)}
    />
  );
}
