"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { useState } from "react";
import AppField, { type FieldSize } from "./AppField";
import PasswordRevealButton from "./PasswordRevealButton";

interface AppPasswordFieldProps {
  field: AnyFieldApi;
  label: React.ReactNode;
  // "current-password" to sign in, "new-password" when choosing one -- so
  // password managers fill the first and offer to generate the second.
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  prepend?: React.ReactNode;
  aside?: React.ReactNode;
  description?: React.ReactNode;
  size?: FieldSize;
}

// A password input with its own show/hide toggle.
const AppPasswordField = ({ field, label, autoComplete, placeholder, prepend, aside, description, size = "md" }: AppPasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <AppField
      field={field}
      label={label}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      prepend={prepend}
      aside={aside}
      description={description}
      size={size}
      append={<PasswordRevealButton visible={visible} onToggle={() => setVisible((value) => !value)} size={size === "xl" ? "lg" : "sm"} />}
    />
  );
};

export default AppPasswordField;
