"use client";

import { GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RowActions } from "@/components/admin/RowActions";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/catalog";

export function CategoryRow({
  category,
  active,
  indented,
  subcategoriesLabel,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  category: Category;
  active: boolean;
  indented: boolean;
  subcategoriesLabel?: string;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onToggleActive: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-3",
        indented && "ms-8",
      )}
    >
      <GripVertical className="size-4 shrink-0 cursor-grab text-text-secondary" />
      <span className="flex-1 text-sm font-medium text-text-primary">
        {category.name.en} / {category.name.ar}
      </span>
      {subcategoriesLabel !== undefined && (
        <span className="w-40 shrink-0 text-sm text-text-secondary">{subcategoriesLabel}</span>
      )}
      <Switch checked={active} onCheckedChange={onToggleActive} />
      <RowActions itemLabel={category.name.en} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
