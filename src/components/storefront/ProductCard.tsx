import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Cake } from "@/types/catalog";

export function ProductCard({
  cake,
  priority,
  className,
}: {
  cake: Cake;
  priority?: boolean;
  className?: string;
}) {
  const locale = useLocale() as "en" | "ar";
  const t = useTranslations("Common");

  return (
    <Link
      href={`/cakes/${cake.id}`}
      className={cn(
        "group flex w-[340px] shrink-0 snap-start flex-col items-start rounded-3xl bg-bg-surface px-3 pb-4 pt-3 drop-shadow-[0px_1px_1.5px_rgba(43,30,25,0.08)] transition-shadow hover:drop-shadow-[0px_4px_10px_rgba(43,30,25,0.14)]",
        className,
      )}
    >
      <div className="relative h-[280px] w-full overflow-hidden rounded-2xl bg-bg-surface-alt">
        {cake.primary_image_url && (
          <Image
            src={cake.primary_image_url}
            alt={cake.name[locale]}
            fill
            sizes="340px"
            priority={priority}
            className="object-contain transition-transform duration-300 group-hover:scale-110"
          />
        )}
      </div>
      <div className="flex w-full flex-col gap-1 p-3">
        <p className="line-clamp-1 text-base font-semibold text-text-primary">{cake.name[locale]}</p>
        <p className="text-xl font-semibold text-text-primary">
          {cake.base_price > 0 ? `${cake.base_price} ${t("egp")}` : t("priceOnRequest")}
        </p>
      </div>
    </Link>
  );
}
