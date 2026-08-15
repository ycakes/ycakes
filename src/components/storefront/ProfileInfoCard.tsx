"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { InputField } from "@/components/storefront/InputField";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

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
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: draftFirstName, last_name: draftLastName })
      .eq("id", session.user.id);
    setSaving(false);
    if (!error) {
      onSaved(draftFirstName, draftLastName);
      setEditing(false);
    }
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
