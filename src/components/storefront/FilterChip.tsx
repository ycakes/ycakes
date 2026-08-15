import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center rounded-full px-3 py-2 text-sm",
        active
          ? "bg-brand-primary text-text-on-brand"
          : "border-[1.5px] border-border-default bg-bg-surface text-text-primary",
      )}
    >
      {label}
    </Link>
  );
}
