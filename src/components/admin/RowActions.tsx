"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function RowActions({
  onEdit,
  onDelete,
  itemLabel,
  editHref,
}: {
  onEdit?: () => void;
  onDelete: () => void;
  itemLabel: string;
  editHref?: string;
}) {
  const t = useTranslations("Admin.table");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-[4px]">
      {editHref ? (
        <Link href={editHref}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("edit")}
            className="size-[32px] rounded-[8px] text-text-secondary"
          >
            <Pencil className="size-[16px]" />
          </Button>
        </Link>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("edit")}
          onClick={onEdit}
          className="size-[32px] rounded-[8px] text-text-secondary"
        >
          <Pencil className="size-[16px]" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("delete")}
        onClick={() => setConfirming(true)}
        className="size-[32px] rounded-[8px] text-destructive"
      >
        <Trash2 className="size-[16px]" />
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
