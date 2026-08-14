import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Pagination({
  basePath,
  currentPage,
  totalPages,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pageHref = (page: number) => (page === 1 ? basePath : `${basePath}?page=${page}`);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2.5">
      <PageButton
        href={pageHref(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        label="←"
      />
      {pages.map((page) => (
        <Link
          key={page}
          href={pageHref(page)}
          className={cn(
            "flex size-10 items-center justify-center rounded-full text-sm font-semibold",
            page === currentPage
              ? "bg-brand-primary text-white"
              : "border border-border-default text-text-secondary",
          )}
        >
          {page}
        </Link>
      ))}
      <PageButton
        href={pageHref(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        label="→"
      />
    </div>
  );
}

function PageButton({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="flex size-10 items-center justify-center rounded-full border border-border-default text-sm font-semibold text-text-secondary/40">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex size-10 items-center justify-center rounded-full border border-border-default text-sm font-semibold text-text-secondary"
    >
      {label}
    </Link>
  );
}
