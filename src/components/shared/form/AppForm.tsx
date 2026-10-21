"use client";

import { cn } from "@/lib/utils";
import { UniqueFieldIds } from "./FormFieldShell";

interface AppFormProps {
  // Usually TanStack Form's form.handleSubmit.
  onSubmit: () => unknown;
  children: React.ReactNode;
  className?: string;
  // Every field takes an id of its own instead of its name, for a form that
  // can be on the page twice (a template editor's channels side by side).
  uniqueIds?: boolean;
}

// The <form> wrapper every TanStack form uses: native validation off (zod
// owns it), the browser submit swallowed, and submission handed to the form.
const AppForm = ({ onSubmit, children, className, uniqueIds = false }: AppFormProps) => {
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
      {uniqueIds ? <UniqueFieldIds>{children}</UniqueFieldIds> : children}
    </form>
  );
};

export default AppForm;
