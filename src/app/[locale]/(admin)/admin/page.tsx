import { ChevronRight, ShoppingBag, Clock, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sum(rows: { final_price: number | null }[]) {
  return rows.reduce((total, row) => total + (row.final_price ?? 0), 0);
}

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Admin.dashboard");
  const tOrders = await getTranslations("Admin.orders");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || undefined;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const in7Days = new Date(todayStart);
  in7Days.setDate(in7Days.getDate() + 7);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [{ count: todayCount }, { count: pendingCount }, { data: thisMonthOrders }, { data: lastMonthOrders }, { data: upcoming }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", tomorrowStart.toISOString()),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("orders")
        .select("final_price")
        .eq("status", "completed")
        .gte("created_at", thisMonthStart.toISOString())
        .lt("created_at", new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()),
      supabase
        .from("orders")
        .select("final_price")
        .eq("status", "completed")
        .gte("created_at", lastMonthStart.toISOString())
        .lt("created_at", thisMonthStart.toISOString()),
      supabase
        .from("orders")
        .select("id, order_number, guest_name, fulfillment_type, fulfillment_date, status, profiles(first_name, last_name), delivery_areas(name)")
        .gte("fulfillment_date", toISODate(todayStart))
        .lt("fulfillment_date", toISODate(in7Days))
        .neq("status", "cancelled")
        .order("fulfillment_date", { ascending: true })
        .limit(10),
    ]);

  const revenueThisMonth = sum(thisMonthOrders ?? []);
  const revenueLastMonth = sum(lastMonthOrders ?? []);
  let trend: React.ReactNode = null;
  if (revenueLastMonth > 0) {
    const pct = Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100);
    if (pct > 0) {
      trend = <p className="text-sm font-medium text-status-completed">{t("trendUp", { pct })}</p>;
    } else if (pct < 0) {
      trend = <p className="text-sm font-medium text-destructive">{t("trendDown", { pct: Math.abs(pct) })}</p>;
    } else {
      trend = <p className="text-sm text-text-secondary">{t("trendFlat")}</p>;
    }
  } else if (revenueThisMonth > 0) {
    trend = <p className="text-sm font-medium text-status-completed">{t("trendUp", { pct: 100 })}</p>;
  } else {
    trend = <p className="text-sm text-text-secondary">{t("trendNoLastMonth")}</p>;
  }

  const currentMonthISO = toISODate(thisMonthStart);
  const monthEndISO = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-primary">
          {name ? t("welcomeNamed", { name }) : t("welcomeGeneric")}
        </h1>
        <p className="text-text-secondary">{t("subline")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-[24px] border border-border-default bg-bg-surface p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <p className="font-heading text-3xl font-bold text-text-primary">{todayCount ?? 0}</p>
            <p className="text-sm text-text-secondary">{t("todayOrdersSubtext")}</p>
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-text-secondary">{t("todayOrders")}</p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button render={<Link href="/admin/orders" />} variant="brand-primary" size="sm" className="flex-1 justify-center">
              {t("viewAllOrders")}
            </Button>
            <Button
              render={<Link href={`/admin/orders?orderFrom=${toISODate(todayStart)}&orderTo=${toISODate(todayStart)}`} />}
              variant="brand-ghost"
              size="sm"
              className="flex-1 justify-center bg-bg-surface"
            >
              {t("filterToday")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[24px] border border-border-default bg-bg-surface p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-status-pending/10 text-status-pending">
            <Clock className="size-5" />
          </span>
          <div>
            <p className="font-heading text-3xl font-bold text-text-primary">{pendingCount ?? 0}</p>
            <p className="text-sm font-medium text-status-pending">{t("pendingOrdersSubtext")}</p>
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-text-secondary">{t("pendingOrders")}</p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button render={<Link href="/admin/orders" />} variant="brand-primary" size="sm" className="flex-1 justify-center">
              {t("viewAllOrders")}
            </Button>
            <Button
              render={<Link href="/admin/orders?status=pending" />}
              variant="brand-ghost"
              size="sm"
              className="flex-1 justify-center bg-bg-surface"
            >
              {t("filterPending")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[24px] border border-border-default bg-bg-surface p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-status-completed/10 text-status-completed">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="font-heading text-3xl font-bold text-text-primary" dir="ltr">
              {revenueThisMonth.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
            </p>
            {trend}
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.4px] text-text-secondary">{t("revenueThisMonth")}</p>
          <div className="mt-auto">
            <Button
              render={<Link href={`/admin/analytics?tab=revenue&period=custom&from=${currentMonthISO}&to=${monthEndISO}`} />}
              variant="brand-primary"
              size="sm"
              className="w-full justify-center"
            >
              {t("viewRevenue")}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-border-default bg-bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-primary">{t("upcomingDeliveries")}</h2>
            <p className="text-sm text-text-secondary">{t("upcomingDeliveriesHint")}</p>
          </div>
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline">
            {t("viewAllOrdersLink")}
          </Link>
        </div>

        {(!upcoming || upcoming.length === 0) ? (
          <p className="py-8 text-center text-text-secondary">{t("noUpcomingDeliveries")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border-default">
            {(upcoming as unknown as {
              id: string;
              order_number: string;
              guest_name: string | null;
              fulfillment_type: "delivery" | "pickup";
              fulfillment_date: string;
              profiles: { first_name: string | null; last_name: string | null } | null;
              delivery_areas: { name: { en: string; ar: string } } | null;
            }[]).map((order) => {
              const customerName =
                [order.profiles?.first_name, order.profiles?.last_name].filter(Boolean).join(" ").trim() ||
                order.guest_name ||
                "—";
              const areaName = order.delivery_areas?.name?.[locale as "en" | "ar"] ?? order.delivery_areas?.name?.en;
              return (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-text-primary">
                      {order.order_number} — {customerName}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
                        (() => {
                          const [y, m, d] = order.fulfillment_date.split("-").map(Number);
                          return new Date(y, m - 1, d);
                        })(),
                      )}
                      {" • "}
                      {order.fulfillment_type === "delivery" ? areaName ?? "" : tOrders("pickup")}
                    </span>
                  </div>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex shrink-0 items-center gap-0.5 rounded-full border border-border-default px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-bg-surface-alt"
                  >
                    {t("view")}
                    <ChevronRight className="size-4 rtl:rotate-180" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
