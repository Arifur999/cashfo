"use client";

import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import TemporaryPasswordDialog from "@/components/shared/dialog/TemporaryPasswordDialog";
import { Button } from "@/components/ui/button";
import type { ICreatedAdmin } from "@/types/adminAccount.types";
import CreateAdminForm from "./CreateAdminForm";
import T from "@/components/shared/T";

// Creating an account hands back a temporary password, revealed once in a
// follow-up dialog.
const CreateAdminDialog = () => {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<ICreatedAdmin | null>(null);

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add an admin"
        description="A panel account with one role. They get a temporary password to sign in with, shown to you once."
        size="sm"
        trigger={
          <Button size="lg" className="font-semibold shadow-button">
            <T>Add an admin</T>
          </Button>
        }
      >
        <CreateAdminForm
          onCreated={(admin) => {
            setOpen(false);
            setCreated(admin);
          }}
        />
      </FormDialog>
      <TemporaryPasswordDialog password={created?.temporaryPassword ?? null} accountName={created?.name} onClose={() => setCreated(null)} />
    </>
  );
};

export default CreateAdminDialog;
