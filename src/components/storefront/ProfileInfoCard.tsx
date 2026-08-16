"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { InputField } from "@/components/storefront/InputField";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export function ProfileInfoCard({
  session,
  firstName,
  lastName,
  onSaved,
}: {
  session: Session;
  firstName: string;
  lastName: string;
  onSaved: (firstName: string, lastName: string) => void;
}) {
  const t = useTranslations("Profile");
  const [editing, setEditing] = useState(false);
  const [draftFirstName, setDraftFirstName] = useState(firstName);
  const [draftLastName, setDraftLastName] = useState(lastName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetPasswordFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  }

  function startEditing() {
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    resetPasswordFields();
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setError(null);
    const wantsPasswordChange = currentPassword || newPassword || confirmNewPassword;

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        setError(t("errorPasswordFieldsRequired"));
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError(t("errorPasswordMismatch"));
        return;
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setError(t("errorPasswordTooShort"));
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();

    if (wantsPasswordChange) {
      // Supabase has no standalone "verify current password" call — signing
      // in again with it is the way to confirm the caller actually knows it
      // before updateUser() is allowed to change it.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: currentPassword,
      });
      if (reauthError) {
        setSaving(false);
        setError(t("errorCurrentPasswordWrong"));
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setSaving(false);
        setError(t("errorGeneric"));
        return;
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ first_name: draftFirstName, last_name: draftLastName })
      .eq("id", session.user.id);
    setSaving(false);
    if (profileError) {
      setError(t("errorGeneric"));
      return;
    }
    onSaved(draftFirstName, draftLastName);
    resetPasswordFields();
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="font-heading text-xl font-semibold text-text-primary">{t("profileInfoTitle")}</p>
        {!editing && (
          <Button type="button" variant="brand-ghost" onClick={startEditing}>
            {t("edit")}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <InputField label={t("firstName")} value={draftFirstName} onChange={setDraftFirstName} />
          <InputField label={t("lastName")} value={draftLastName} onChange={setDraftLastName} />

          <p className="mt-2 text-[13px] font-semibold text-text-secondary">{t("changePasswordTitle")}</p>
          <InputField
            label={t("currentPassword")}
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <InputField
            label={t("newPassword")}
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <InputField
            label={t("confirmNewPassword")}
            type="password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            autoComplete="new-password"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="brand-primary" disabled={saving} onClick={handleSave}>
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-secondary">
            {firstName} {lastName}
          </p>
          <p className="text-sm text-text-secondary">{session.user.email}</p>
        </div>
      )}
    </div>
  );
}
