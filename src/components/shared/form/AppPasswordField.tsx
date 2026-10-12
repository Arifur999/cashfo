"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { useState } from "react";
import AppField from "./AppField";
import PasswordRevealButton from "./PasswordRevealButton";

interface AppPasswordFieldProps {
  field: AnyFieldApi;
  label: string;
  // "current-password" to sign in, "new-password" when choosing one -- so
  // password managers fill the first and offer to generate the second.
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  description?: React.ReactNode;
}

// A password input with its own show/hide toggle.
const AppPasswordField = ({ field, label, autoComplete, placeholder, description }: AppPasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <AppField
      field={field}
      label={label}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      description={description}
      append={<PasswordRevealButton visible={visible} onToggle={() => setVisible((value) => !value)} />}
    />
  );
};

export default AppPasswordField;
