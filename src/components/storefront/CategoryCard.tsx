import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/types/catalog";

export function CategoryCard({
  category,
  subtitle,
  priority,
}: {
  category: Category;
  subtitle: string;
  priority?: boolean;
}) {
  const locale = useLocale() as "en" | "ar";

  return (
    <Link
      href={`/shop/${category.slug}`}
      className="group flex w-[280px] flex-col items-start gap-3 rounded-3xl bg-bg-surface p-2.5 drop-shadow-[0px_1px_1.5px_rgba(43,30,25,0.08)] transition-shadow hover:drop-shadow-[0px_4px_8px_rgba(43,30,25,0.12)]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-bg-surface-alt">
        {category.image_url && (
          <Image
            src={category.image_url}
            alt={category.name[locale]}
            fill
            sizes="(max-width: 768px) 45vw, 280px"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        )}
      </div>
      <div className="flex w-full items-center justify-between px-1 pb-1">
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] font-semibold text-text-primary">{category.name[locale]}</p>
          <p className="text-sm font-medium text-text-secondary">{subtitle}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-secondary">
          <Image
            src="/icons/arrow-right.svg"
            alt=""
            width={16}
            height={16}
            className="rtl:rotate-180"
          />
        </div>
      </div>
    </Link>
  );
}
