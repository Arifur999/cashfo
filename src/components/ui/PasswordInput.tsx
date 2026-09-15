"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  // Left unset (browser default) everywhere except VaultEntryModal, which
  // passes "new-password" + a non-guessable name -- otherwise Chrome
  // recognizes a text-field-then-password-field pair and auto-fills it with
  // this app's OWN saved login credentials, not blank, since that per-entry
  // password has nothing to do with account login.
  autoComplete?: string;
  name?: string;
}

// Show/hide toggle (eye icon) shared by every password field in the app --
// starts hidden, same default every password manager/browser assumes.
export function PasswordInput({ value, onChange, className, autoComplete, name }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        name={name}
        className={
          className ??
          "w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        }
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
