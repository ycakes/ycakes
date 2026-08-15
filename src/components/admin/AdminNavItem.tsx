import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminNavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string | null;
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const content = (
    <span
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-primary text-text-on-brand"
          : href
            ? "text-text-primary hover:bg-bg-surface-alt"
            : "cursor-not-allowed text-text-secondary/50",
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </span>
  );

  if (!href) return <div title={collapsed ? label : undefined}>{content}</div>;

  return (
    <Link href={href} title={collapsed ? label : undefined}>
      {content}
    </Link>
  );
}
