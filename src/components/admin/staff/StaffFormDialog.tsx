"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type StaffFormValue = {
  id?: string;
  email: string;
  role: "admin" | "accountant";
};

export function StaffFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
  error,
}: {
  open: boolean;
  initialValue: StaffFormValue | null;
  onSave: (value: StaffFormValue) => void;
  onCancel: () => void;
  error: string | null;
}) {
  const t = useTranslations("Admin.table");
  const tStaff = useTranslations("Admin.staff");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [role, setRole] = useState<StaffFormValue["role"]>(initialValue?.role ?? "admin");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? tStaff("editStaffMember") : tStaff("addStaffMember")}
          </Dialog.Title>
          <p className="mt-1 text-[13px] text-text-secondary">{tStaff("modalHint")}</p>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tStaff("email")}
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tStaff("emailPlaceholder")}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tStaff("role")}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffFormValue["role"])}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              >
                <option value="admin">{tStaff("roleAdmin")}</option>
                <option value="accountant">{tStaff("roleAccountant")}</option>
              </select>
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() => onSave({ id: initialValue?.id, email: email.trim(), role })}
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
