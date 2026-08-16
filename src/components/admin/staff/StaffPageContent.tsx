"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { StaffFormDialog, type StaffFormValue } from "./StaffFormDialog";

export type StaffRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: "admin" | "accountant";
  created_at: string;
};

export function StaffPageContent({ initialStaff, currentUserId }: { initialStaff: StaffRow[]; currentUserId: string }) {
  const t = useTranslations("Admin.table");
  const tStaff = useTranslations("Admin.staff");
  const [staff, setStaff] = useState(initialStaff);
  const [editing, setEditing] = useState<StaffFormValue | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const supabase = createClient();

  async function refresh() {
    const { data, error: fetchError } = await supabase.rpc("admin_list_staff");
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setStaff(data as StaffRow[]);
  }

  async function handleSave(value: StaffFormValue) {
    setFormError(null);
    if (!value.email) {
      setFormError(tStaff("emailRequired"));
      return;
    }
    const { error: saveError } = await supabase.rpc("admin_set_staff_role", { p_email: value.email, p_role: value.role });
    if (saveError) {
      setFormError(saveError.message);
      return;
    }
    setEditing(undefined);
    await refresh();
  }

  async function handleRevoke(row: StaffRow) {
    setError(null);
    const { error: revokeError } = await supabase.rpc("admin_revoke_staff_role", { p_profile_id: row.id });
    if (revokeError) {
      setError(revokeError.message);
      return;
    }
    await refresh();
  }

  const columns: AdminTableColumn<StaffRow>[] = [
    {
      header: tStaff("name"),
      render: (row) => {
        const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || tStaff("unnamed");
        const isYou = row.id === currentUserId;
        return (
          <span className="text-[14px] font-medium text-text-primary">
            {name}
            {isYou && <span className="text-text-secondary"> {tStaff("you")}</span>}
          </span>
        );
      },
    },
    { header: tStaff("email"), render: (row) => <span className="text-text-secondary">{row.email}</span> },
    {
      header: tStaff("role"),
      render: (row) => (
        <span
          className={
            row.role === "admin"
              ? "inline-flex items-center rounded-full bg-brand-primary/15 px-2.5 py-1 text-[12px] font-semibold text-brand-primary"
              : "inline-flex items-center rounded-full bg-[#4a6fa5]/15 px-2.5 py-1 text-[12px] font-semibold text-[#4a6fa5]"
          }
        >
          {row.role === "admin" ? tStaff("roleAdmin") : tStaff("roleAccountant")}
        </span>
      ),
    },
    {
      header: tStaff("added"),
      render: (row) => new Date(row.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    },
    {
      header: t("actions"),
      align: "end",
      render: (row) => {
        if (row.id === currentUserId) {
          return <span className="text-[13px] text-text-secondary">—</span>;
        }
        const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email;
        return (
          <RowActions
            itemLabel={name}
            onEdit={() => {
              setFormError(null);
              setEditing({ id: row.id, email: row.email, role: row.role });
            }}
            onDelete={() => handleRevoke(row)}
            deleteTitle={tStaff("revokeTitle")}
            deleteMessage={tStaff("revokeMessage", { name })}
            deleteLabel={tStaff("revoke")}
          />
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{tStaff("title")}</h1>
        <Button
          type="button"
          variant="brand-primary"
          size="xl"
          className="px-5 py-3 text-base"
          onClick={() => {
            setFormError(null);
            setEditing(null);
            setAddKey((k) => k + 1);
          }}
        >
          {tStaff("addStaffMember")}
        </Button>
      </div>
      <p className="text-sm text-text-secondary">{tStaff("hint")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AdminTable columns={columns} rows={staff} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <StaffFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={handleSave}
        onCancel={() => setEditing(undefined)}
        error={formError}
      />
    </div>
  );
}
