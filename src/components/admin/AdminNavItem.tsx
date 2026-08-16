import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminNavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  dimmed = false,
}: {
  href: string | null;
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  dimmed?: boolean;
}) {
  const content = (
    <span
      className={cn(
        "flex h-[36px] items-center gap-[12px] rounded-[16px] px-[12px] py-[8px] font-sans text-[14px] transition-colors",
        active
          ? "bg-brand-primary font-semibold text-text-on-brand"
          : href
            ? "font-medium text-text-secondary hover:bg-bg-surface-alt"
            : "cursor-default font-medium text-text-secondary",
      )}
    >
      <span className={cn("flex shrink-0 items-center justify-center", dimmed && "opacity-40")}>
        <Icon className="size-[18px]" />
      </span>
      {!collapsed && (
        <span className={cn("truncate", dimmed && "opacity-50")}>{label}</span>
      )}
    </span>
  );

  if (!href)
    return (
      <div title={label} aria-disabled="true">
        {content}
      </div>
    );

  return (
    <Link href={href} title={collapsed ? label : undefined}>
      {content}
    </Link>
  );
}
