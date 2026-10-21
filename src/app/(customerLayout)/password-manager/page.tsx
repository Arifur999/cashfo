import { redirect } from "next/navigation";
import { VaultPageClient } from "@/components/modules/Customer/Vault/VaultPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getVaultStatus } from "@/lib/customer/vault";

export const generateMetadata = () => customerPageMetadata("/password-manager");

// Security › Password vault. Whether a vault password exists is readable
// with the session alone; everything else needs the vault unlocked.
export default async function PasswordManagerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const status = await getVaultStatus();
  return <VaultPageClient hasVaultPassword={status?.hasVaultPassword ?? false} />;
}
