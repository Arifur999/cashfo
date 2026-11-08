"use client";

import { useForm } from "@tanstack/react-form";
import { Mail, UserPlus } from "lucide-react";
import { useId, useState } from "react";
import { createAdminAction, inviteAdminAction } from "@/app/(dashboardLayout)/admin/security/(sections)/admins/_action";
import CreateButton from "@/components/shared/CreateButton";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import TemporaryPasswordDialog from "@/components/shared/dialog/TemporaryPasswordDialog";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { ICreatedAdmin, ICreatedAdminInvite } from "@/types/adminAccount.types";
import { createAdminFormZodSchema, type IInviteAdminFormValues, inviteAdminFormZodSchema } from "@/zod/adminAccount.validation";
import InviteLinkDialog, { type InviteLink } from "./InviteLinkDialog";
import RoleChoices from "./RoleChoices";

const DEFAULT_VALUES: IInviteAdminFormValues = { name: "", email: "", role: "SUPPORT_ADMIN" };

// "invite" emails a one-time link; "password" makes the account now with a
// temporary password shown once, for when email isn't set up yet.
type Mode = "invite" | "password";

const LINK = "font-semibold text-emerald hover:underline";

// Mounted inside the drawer, so each open starts empty.
const InviteAdminForm = ({ onDone, onCreated, onLink }: { onDone: () => void; onCreated: (admin: ICreatedAdmin) => void; onLink: (invite: InviteLink) => void }) => {
  const { translate } = useLocale();
  const [mode, setMode] = useState<Mode>("invite");
  const roleLegend = useId();
  const invite = useActionMutation({
    action: inviteAdminAction,
    successMessage: (sent: ICreatedAdminInvite) => (sent.link ? translate("Invite ready for {email}", { email: sent.email }) : translate("Invite sent to {email}", { email: sent.email })),
    invalidateKeys: [queryKeys.admins.all],
    // Email off: the link comes back, to pass on by hand.
    onSuccess: (sent: ICreatedAdminInvite) => (sent.link ? onLink({ email: sent.email, link: sent.link }) : onDone()),
    refreshRoute: false,
  });
  const create = useActionMutation({
    action: createAdminAction,
    successMessage: (admin) => translate("{name}'s account is ready", { name: admin.name }),
    // The new account also joins the assignee and audit-log filters.
    invalidateKeys: [queryKeys.admins.all],
    onSuccess: onCreated,
    refreshRoute: false,
  });
  const isPending = invite.isPending || create.isPending;

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      if (mode === "invite") await invite.run(value);
      else await create.run(value);
    },
  });
  const { shape } = mode === "invite" ? inviteAdminFormZodSchema : createAdminFormZodSchema;

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex min-h-full flex-1 flex-col gap-3.5 space-y-0">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {/* Keyed by the mode: a password account needs a name, an invite doesn't. */}
        <form.Field key={mode} name="name" validators={{ onChange: shape.name, onSubmit: shape.name }}>
          {(field) => <AppField field={field} label="Name" size="sm" autoComplete="off" />}
        </form.Field>
        <form.Field name="email" validators={{ onChange: shape.email }}>
          {(field) => <AppField field={field} label="Email" type="email" size="sm" autoComplete="off" />}
        </form.Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend id={roleLegend} className="mb-2 text-[13.5px] font-medium text-ink">
          <T>Role</T>
        </legend>
        <form.Field name="role">{(field) => <RoleChoices value={field.state.value} onChange={field.handleChange} labelledBy={roleLegend} />}</form.Field>
      </fieldset>
      {mode === "invite" ? (
        <>
          {/* Accepting an invite always sets up two-step sign-in: the API asks
              for the first code from the app before the account exists. */}
          <div className="flex items-center gap-3">
            <span className="flex grow flex-col gap-px">
              <span className="text-body font-medium text-ink">
                <T>Two-step sign-in from day one</T>
              </span>
              <span className="text-[12.5px] text-ink-muted">
                <T>They set it up while accepting the invite</T>
              </span>
            </span>
            <Switch checked disabled aria-label={translate("Require two-step")} className="data-checked:bg-emerald disabled:opacity-100" />
          </div>
          <p className="text-[12.5px] leading-normal text-ink-muted">
            <T>The invite link works once and ends in 7 days. Email not set up yet?</T>{" "}
            <button type="button" className={LINK} onClick={() => setMode("password")}>
              <T>Set a first password instead</T>
            </button>
            .
          </p>
        </>
      ) : (
        <p className="text-[12.5px] leading-normal text-ink-muted">
          <T>They get a temporary password, shown to you once, and change it after signing in.</T>{" "}
          <button type="button" className={LINK} onClick={() => setMode("invite")}>
            <T>Send an invite instead</T>
          </button>
          .
        </p>
      )}
      <DialogFooter className="sticky bottom-0 z-10 -mx-6 mt-auto -mb-5 flex-row justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
        <DialogClose asChild>
          <Button type="button" variant="secondary" size="md" disabled={isPending}>
            <T>Cancel</T>
          </Button>
        </DialogClose>
        <AppSubmitButton isPending={isPending} pendingLabel={mode === "invite" ? "Sending..." : "Creating..."} variant="action" size="md" className="w-auto">
          {mode === "invite" ? <Mail aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
          <T>{mode === "invite" ? "Send invite" : "Create account"}</T>
        </AppSubmitButton>
      </DialogFooter>
    </AppForm>
  );
};

// Security > Admin team's header button and its drawer: an emailed invite,
// or an account with a first password when email isn't set up yet.
const InviteAdminDrawer = () => {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<ICreatedAdmin | null>(null);
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);

  return (
    <>
      <FormDrawer open={open} onOpenChange={setOpen} title="Invite an admin" centered trigger={<CreateButton>Invite an admin</CreateButton>}>
        <InviteAdminForm
          onDone={() => setOpen(false)}
          onLink={(invite) => {
            setOpen(false);
            setInviteLink(invite);
          }}
          onCreated={(admin) => {
            setOpen(false);
            setCreated(admin);
          }}
        />
      </FormDrawer>
      <TemporaryPasswordDialog password={created?.temporaryPassword ?? null} accountName={created?.name} onClose={() => setCreated(null)} />
      <InviteLinkDialog invite={inviteLink} onClose={() => setInviteLink(null)} />
    </>
  );
};

export default InviteAdminDrawer;
