"use client";

import { Link } from "@/i18n/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTableColumn<T> = {
  header: string;
  render: (row: T) => React.ReactNode;
  sortKey?: string;
};

export function AdminTable<T>({
  columns,
  rows,
  getRowId,
  emptyMessage,
  currentSortKey,
  currentSortDir,
  buildSortHref,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage: string;
  currentSortKey?: string | null;
  currentSortDir?: "asc" | "desc";
  buildSortHref?: (key: string, nextDir: "asc" | "desc") => string;
}) {
  if (rows.length === 0) {
    return <p className="py-16 text-center text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-surface-alt text-start">
            {columns.map((col) => {
              const isSorted = buildSortHref && col.sortKey && currentSortKey === col.sortKey;
              const nextDir = isSorted && currentSortDir === "asc" ? "desc" : "asc";
              const header = (
                <span className="flex items-center gap-1">
                  {col.header}
                  {isSorted && (currentSortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                </span>
              );
              return (
                <th key={col.header} className="p-3 text-start font-semibold text-text-primary">
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
          {rows.map((row) => (
            <tr key={getRowId(row)} className={cn("border-b border-border-default last:border-0 hover:bg-bg-surface-alt")}>
              {columns.map((col) => (
                <td key={col.header} className="p-3 align-middle text-text-primary">
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
