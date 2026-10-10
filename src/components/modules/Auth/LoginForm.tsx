"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Info } from "lucide-react";
import { useState } from "react";
import { loginAction } from "@/app/(auth)/admin/login/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import PasswordRevealButton from "@/components/shared/form/PasswordRevealButton";
import { loginFormZodSchema, type ILoginFormValues } from "@/zod/auth.validation";

const defaultValues: ILoginFormValues = { email: "", password: "" };

interface LoginFormProps {
  redirectTo?: string;
  sessionExpired?: boolean;
}

const LoginForm = ({ redirectTo, sessionExpired = false }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: ILoginFormValues) => loginAction(values, redirectTo),
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerError(null);
      // Success redirects away; only a failure ever resolves here.
      const result = await mutateAsync(value);
      if (!result.success) {
        setServerError(result.message);
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-4">
      {sessionExpired && !serverError && (
        <p className="flex items-start gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Your session has expired. Please sign in again.
        </p>
      )}

      <form.Field name="email" validators={{ onChange: loginFormZodSchema.shape.email }}>
        {(field) => (
          <AppField field={field} label="Email" type="email" autoComplete="email" placeholder="admin@example.com" />
        )}
      </form.Field>

      <form.Field name="password" validators={{ onChange: loginFormZodSchema.shape.password }}>
        {(field) => (
          <AppField
            field={field}
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            append={<PasswordRevealButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />}
          />
        )}
      </form.Field>

      {serverError && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {serverError}
        </p>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel="Signing in...">
            Sign In
          </AppSubmitButton>
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default LoginForm;
