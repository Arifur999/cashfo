"use client";

import { Lock } from "lucide-react";
import { useState, useTransition } from "react";
import AppForm from "@/components/shared/form/AppForm";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import IconTile from "@/components/smartly/IconTile";
import PinBoxes from "@/components/smartly/PinBoxes";
import { resetBusinessPinAction, verifyBusinessPinAction } from "@/lib/customer/businessActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PinCardProps {
  businessId: string;
  businessName: string;
  // Only the owner can remove a forgotten PIN with the account password.
  isOwner: boolean;
  onOpened: () => void;
  // The second button: "Cancel" in the chooser's dialog, "Sign out" on the
  // lock screen.
  cancelLabel: string;
  onCancel: () => void;
}

// The PIN panel a locked workspace shows: the lock, "Enter the PIN for …",
// the digit boxes, the forgot link, and Open. The owner can switch to the
// account password and drop the PIN instead.
export function PinCard({ businessId, businessName, isOwner, onOpened, cancelLabel, onCancel }: PinCardProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<"pin" | "forgot">("pin");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitPin() {
    if (pin.length < 4 || isPending) return;
    startTransition(async () => {
      const result = await verifyBusinessPinAction(businessId, pin);
      if (!result.success) {
        setError(result.message ?? t("Failed to verify PIN"));
        return;
      }
      if (result.data?.valid) {
        onOpened();
      } else {
        setError(t("Incorrect PIN, try again."));
        setPin("");
      }
    });
  }

  function submitReset() {
    if (!password || isPending) return;
    startTransition(async () => {
      const result = await resetBusinessPinAction(businessId, password);
      if (!result.success) {
        setError(result.message ?? t("Failed to remove the PIN"));
        return;
      }
      onOpened();
    });
  }

  function switchMode(to: "pin" | "forgot") {
    setMode(to);
    setError(null);
  }

  const forgot = mode === "forgot";

  return (
    <AppForm onSubmit={forgot ? submitReset : submitPin} className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <IconTile tone="loans" size={44}>
          <Lock />
        </IconTile>
        <h2 className="text-h3 leading-[26px] text-ink">
          {forgot ? t("Remove the PIN with your account password") : `${t("Enter the PIN for")} ${businessName}`}
        </h2>
      </div>
      <p className="text-body leading-[21px] text-ink-2">
        {forgot ? t("Enter your account password to remove the PIN.") : `${businessName} ${t("has a PIN so others using this device can't open its books.")}`}
      </p>

      {forgot ? (
        <Input
          id="account-password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
          autoComplete="current-password"
          autoFocus
          aria-label={t("Account password")}
          placeholder={t("Account password")}
          invalid={error !== null}
        />
      ) : (
        <PinBoxes
          value={pin}
          onChange={(next) => {
            setPin(next);
            setError(null);
          }}
          onSubmit={submitPin}
          label={t("PIN")}
          autoFocus
          disabled={isPending}
          invalid={error !== null}
        />
      )}
      {error && (
        <p role="alert" className="text-center text-small font-medium text-expense">
          {error}
        </p>
      )}

      <p className="text-center text-small text-ink-muted">
        {isOwner ? (
          forgot ? (
            <button type="button" onClick={() => switchMode("pin")} className="font-semibold text-emerald hover:underline">
              {t("Enter PIN instead")}
            </button>
          ) : (
            <>
              {t("Forgot the PIN?")}{" "}
              <button type="button" onClick={() => switchMode("forgot")} className="font-semibold text-emerald hover:underline">
                {t("Reset it with your account password")}
              </button>
            </>
          )
        ) : (
          t("Ask the workspace owner for the PIN.")
        )}
      </p>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={isPending || (forgot ? !password : pin.length < 4)}>
          {isPending && <Loader size={16} onDark label={t("Loading...")} />}
          {forgot ? t("Remove PIN") : t("Open")}
        </Button>
      </div>
    </AppForm>
  );
}
