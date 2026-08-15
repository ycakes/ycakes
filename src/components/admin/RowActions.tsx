"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslations } from "next-intl";

export function RowActions({
  onEdit,
  onDelete,
  itemLabel,
}: {
  onEdit: () => void;
  onDelete: () => void;
  itemLabel: string;
}) {
  const t = useTranslations("Admin.table");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("edit")}
        onClick={onEdit}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("delete")}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t("deleteTitle")}
        message={t("deleteMessage", { item: itemLabel })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
