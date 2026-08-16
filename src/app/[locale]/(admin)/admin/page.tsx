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

const PICKUP_LOCATION = { en: "New Cairo", ar: "التجمع الخامس" };

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
      trend = <p className="text-[13px] font-medium text-status-completed">{t("trendUp", { pct })}</p>;
    } else if (pct < 0) {
      trend = <p className="text-[13px] font-medium text-destructive">{t("trendDown", { pct: Math.abs(pct) })}</p>;
    } else {
      trend = <p className="text-[13px] font-medium text-text-secondary">{t("trendFlat")}</p>;
    }
  } else if (revenueThisMonth > 0) {
    trend = <p className="text-[13px] font-medium text-status-completed">{t("trendUp", { pct: 100 })}</p>;
  } else {
    trend = <p className="text-[13px] font-medium text-text-secondary">{t("trendNoLastMonth")}</p>;
  }

  const currentMonthISO = toISODate(thisMonthStart);
  const monthEndISO = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const todayISO = toISODate(todayStart);

  const ghostButtonClass = "h-auto w-full justify-center px-[14px] py-[10px] text-[14px]";

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex h-[80px] shrink-0 items-center justify-center border-b border-border-default bg-bg-surface px-8">
        <h1 className="font-heading text-[28px] font-bold text-brand-primary">{t("pageTitle")}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-6 bg-bg-surface-alt px-8 py-6">
        <div className="flex flex-col gap-1">
          <p className="font-heading text-2xl font-bold text-text-primary">
            {name ? t("welcomeNamed", { name }) : t("welcomeGeneric")}
          </p>
          <p className="text-sm text-text-secondary">{t("subline")}</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
            <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("todayOrders")}</p>
            <p className="font-heading text-[36px] font-bold text-text-primary">{todayCount ?? 0}</p>
            <p className="text-[13px] font-medium text-text-secondary">{t("todayOrdersSubtext")}</p>
            <div className="mt-auto pt-2">
              <Button
                render={<Link href={`/admin/orders?orderFrom=${todayISO}&orderTo=${todayISO}`} />}
                nativeButton={false}
                variant="brand-ghost"
                size="xl"
                className={ghostButtonClass}
              >
                {t("viewTodayOrders")}
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
            <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("pendingOrders")}</p>
            <p className="font-heading text-[36px] font-bold text-text-primary">{pendingCount ?? 0}</p>
            <p className="text-[13px] font-medium text-status-pending">{t("pendingOrdersSubtext")}</p>
            <div className="mt-auto pt-2">
              <Button
                render={<Link href="/admin/orders?status=pending" />}
                nativeButton={false}
                variant="brand-ghost"
                size="xl"
                className={ghostButtonClass}
              >
                {t("viewPendingOrders")}
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
            <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("revenueThisMonth")}</p>
            <p className="font-heading text-[36px] font-bold text-text-primary" dir="ltr">
              {revenueThisMonth.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
            </p>
            {trend}
            <div className="mt-auto pt-2">
              <Button
                render={<Link href={`/admin/analytics?tab=revenue&period=custom&from=${currentMonthISO}&to=${monthEndISO}`} />}
                nativeButton={false}
                variant="brand-ghost"
                size="xl"
                className={ghostButtonClass}
              >
                {t("viewRevenue")}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface px-6 pt-6 pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-heading text-lg font-bold text-text-primary">{t("upcomingDeliveries")}</h2>
              <p className="text-[13px] text-text-secondary">{t("upcomingDeliveriesHint")}</p>
            </div>
            <Link href="/admin/orders" className="shrink-0 text-[13px] font-semibold text-brand-primary hover:underline">
              {t("viewAllOrdersLink")}
            </Link>
          </div>

          {!upcoming || upcoming.length === 0 ? (
            <p className="py-8 text-center text-text-secondary">{t("noUpcomingDeliveries")}</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-4 border-b border-border-default pb-2">
                <span className="w-16 shrink-0 text-[12px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
                  {t("colDate")}
                </span>
                <span className="w-[190px] shrink-0 text-[12px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
                  {t("colOrderNumber")}
                </span>
                <span className="w-[180px] shrink-0 text-[12px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
                  {t("colCustomer")}
                </span>
                <span className="w-[200px] shrink-0 text-[12px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
                  {t("colFulfillment")}
                </span>
                <span className="ms-auto shrink-0 text-[12px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
                  {t("colActions")}
                </span>
              </div>
              {(upcoming as unknown as {
                id: string;
                order_number: string;
                guest_name: string | null;
                fulfillment_type: "delivery" | "pickup";
                fulfillment_date: string;
                profiles: { first_name: string | null; last_name: string | null } | null;
                delivery_areas: { name: { en: string; ar: string } } | null;
              }[]).map((order, index, arr) => {
                const customerName =
                  [order.profiles?.first_name, order.profiles?.last_name].filter(Boolean).join(" ").trim() ||
                  order.guest_name ||
                  "—";
                const areaName = order.delivery_areas?.name?.[locale as "en" | "ar"] ?? order.delivery_areas?.name?.en;
                const [y, m, d] = order.fulfillment_date.split("-").map(Number);
                return (
                  <div
                    key={order.id}
                    className={`flex flex-wrap items-center gap-4 py-3 ${index < arr.length - 1 ? "border-b border-border-default" : ""}`}
                  >
                    <span className="w-16 shrink-0 text-[14px] font-semibold text-text-primary">
                      {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(y, m - 1, d))}
                    </span>
                    <span className="w-[190px] shrink-0 truncate text-[14px] font-medium text-text-primary">{order.order_number}</span>
                    <span className="w-[180px] shrink-0 truncate text-[14px] text-text-secondary">{customerName}</span>
                    <span className="w-[200px] shrink-0 truncate text-[14px] text-text-secondary">
                      {order.fulfillment_type === "delivery"
                        ? `${tOrders("delivery")} • ${areaName ?? ""}`
                        : `${tOrders("pickup")} • ${PICKUP_LOCATION[locale as "en" | "ar"]}`}
                    </span>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="ms-auto shrink-0 text-[13px] font-semibold text-brand-primary hover:underline"
                    >
                      {t("view")}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
