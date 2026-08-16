"use client";

import { Link } from "@/i18n/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTableColumn<T> = {
  header: string;
  render: (row: T) => React.ReactNode;
  sortKey?: string;
  align?: "start" | "end";
};

export function AdminTable<T>({
  columns,
  rows,
  getRowId,
  emptyMessage,
  currentSortKey,
  currentSortDir,
  buildSortHref,
  rowHeight = "60",
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage: string;
  currentSortKey?: string | null;
  currentSortDir?: "asc" | "desc";
  buildSortHref?: (key: string, nextDir: "asc" | "desc") => string;
  rowHeight?: "60" | "64";
}) {
  if (rows.length === 0) {
    return <p className="py-16 text-center text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-border-default">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="h-[44px] border-b border-border-default bg-bg-subtle text-start">
            {columns.map((col) => {
              const isSorted = buildSortHref && col.sortKey && currentSortKey === col.sortKey;
              const nextDir = isSorted && currentSortDir === "asc" ? "desc" : "asc";
              const header = (
                <span
                  className={cn(
                    "flex items-center gap-1 uppercase tracking-[0.48px]",
                    col.align === "end" && "justify-end",
                  )}
                >
                  {col.header}
                  {isSorted && (currentSortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                </span>
              );
              return (
                <th
                  key={col.header}
                  className={cn(
                    "px-[24px] text-[12px] font-semibold text-text-secondary",
                    col.align === "end" ? "text-end" : "text-start",
                  )}
                >
                  {buildSortHref && col.sortKey ? (
                    <Link href={buildSortHref(col.sortKey, nextDir)}>{header}</Link>
                  ) : (
                    header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={getRowId(row)}
              className={cn(
                "border-b border-border-default last:border-0 hover:bg-bg-surface-alt",
                rowHeight === "64" ? "h-[64px]" : "h-[60px]",
                index % 2 === 0 ? "bg-bg-surface" : "bg-bg-subtle",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={cn("px-[24px] align-middle text-text-primary", col.align === "end" && "text-end")}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
