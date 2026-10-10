"use client";

import { cn } from "@/lib/utils";

interface AppFormProps {
  // Usually TanStack Form's form.handleSubmit.
  onSubmit: () => unknown;
  children: React.ReactNode;
  className?: string;
}

// The <form> wrapper every TanStack form uses: native validation off (zod
// owns it), the browser submit swallowed, and submission handed to the form.
const AppForm = ({ onSubmit, children, className }: AppFormProps) => {
  return (
    <form
      method="POST"
      action="#"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void onSubmit();
      }}
      className={cn("space-y-5", className)}
    >
      {children}
    </form>
  );
};

export default AppForm;
