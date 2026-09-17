"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { changePasswordAction, updateProfileAction } from "@/lib/authActions";
import { ChangeAvatarModal } from "./ChangeAvatarModal";

// Splits User.name (a single field, see backend User model) into two boxes
// purely for this form -- there's no firstName/lastName column, avoiding a
// bigger migration that'd touch every place user.name is already displayed.
// Rejoined into one name string on save.
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function ProfileTab() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLocale();

  const [prevUserId, setPrevUserId] = useState(user.id);
  const initialSplit = splitName(user.name);
  const [firstName, setFirstName] = useState(initialSplit.firstName);
  const [lastName, setLastName] = useState(initialSplit.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
  if (user.id !== prevUserId) {
    setPrevUserId(user.id);
    const split = splitName(user.name);
    setFirstName(split.firstName);
    setLastName(split.lastName);
    setPhone(user.phone ?? "");
  }

  const [isSavingProfile, startProfileTransition] = useTransition();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, startPasswordTransition] = useTransition();

  function handleSaveProfile() {
    if (!firstName.trim()) {
      toast.error(t("First name can't be empty"));
      return;
    }
    startProfileTransition(async () => {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const result = await updateProfileAction({ name, phone: phone.trim() });
      if (result.success) {
        toast.success(t("Profile updated"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update profile"));
      }
    });
  }

  function handleUpdatePassword() {
    if (!currentPassword || !newPassword) {
      toast.error(t("Fill in your current and new password"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("New password and confirmation don't match"));
      return;
    }
    startPasswordTransition(async () => {
      const result = await changePasswordAction({ currentPassword, newPassword });
      if (result.success) {
        toast.success(t("Password updated"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.message ?? t("Failed to update password"));
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <h2 className="text-sm font-semibold text-neutral-900">{t("Profile Information")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("Update your personal information")}</p>

        <div className="mt-5 flex flex-col items-center gap-3">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, same convention as Contact photos.
            <img src={user.avatarUrl} alt={user.name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-500">
              {initials(user.name)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t("Change Avatar")}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("First Name")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Last Name")}</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Email")}</label>
          <input
            value={user.email}
            disabled
            title={t("Contact support to change your email")}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-500 outline-none"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Phone Number")}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 1XXX-XXXXXX"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <button
          type="button"
          disabled={isSavingProfile}
          onClick={handleSaveProfile}
          className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Save Changes")}
        </button>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <h2 className="text-sm font-semibold text-neutral-900">{t("Password")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("Update your password")}</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Current Password")}</label>
            <PasswordInput value={currentPassword} onChange={setCurrentPassword} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("New Password")}</label>
            <PasswordInput value={newPassword} onChange={setNewPassword} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Confirm New Password")}</label>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} />
          </div>
        </div>

        <button
          type="button"
          disabled={isSavingPassword}
          onClick={handleUpdatePassword}
          className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isSavingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Update Password")}
        </button>
      </div>

      <ChangeAvatarModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} currentAvatarUrl={user.avatarUrl} name={user.name} />
    </div>
  );
}
