import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/requireAdmin";
import { resolvePeriod, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import {
  CustomersListContent,
  type CustomerAddress,
  type CustomerListRow,
  type CustomerOrderRow,
  type CustomerPhone,
} from "@/components/admin/analytics/CustomersListContent";
import type { OrderStatus } from "@/types/orders";

const VALID_PERIODS: AnalyticsPeriod[] = ["day", "week", "month", "year", "custom", "all"];

export default async function CustomersListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const profile = await requireStaff(locale);
  const supabase = await createClient();

  const sp = await searchParams;
  const period: AnalyticsPeriod = VALID_PERIODS.includes(sp.period as AnalyticsPeriod) ? (sp.period as AnalyticsPeriod) : "month";
  const customFrom = sp.from ?? null;
  const customTo = sp.to ?? null;
  const resolved = resolvePeriod(period, customFrom, customTo);

  const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").eq("role", "customer");
  const customerIds = ((profiles ?? []) as { id: string; first_name: string | null; last_name: string | null }[]).map((p) => p.id);

  let ordersQuery = supabase
    .from("orders")
    .select("id, order_number, customer_id, status, final_price, created_at")
    .in("customer_id", customerIds.length > 0 ? customerIds : ["00000000-0000-0000-0000-000000000000"])
    .lt("created_at", resolved.to.toISOString());
  if (resolved.from) ordersQuery = ordersQuery.gte("created_at", resolved.from.toISOString());

  const showAddressesPhones = profile.role === "admin";

  const [{ data: orders }, addressesResult, phonesResult] = await Promise.all([
    ordersQuery,
    showAddressesPhones
      ? supabase.from("customer_addresses").select("id, customer_id, label, address, apartment")
      : Promise.resolve({ data: [] }),
    showAddressesPhones
      ? supabase.from("customer_phones").select("id, customer_id, phone, contact_method")
      : Promise.resolve({ data: [] }),
  ]);

  type OrderRow = { id: string; order_number: string; customer_id: string; status: OrderStatus; final_price: number | null; created_at: string };
  const orderRows = (orders ?? []) as unknown as OrderRow[];

  type AddressRow = CustomerAddress & { customer_id: string };
  type PhoneRow = CustomerPhone & { customer_id: string };
  const addressRows = (addressesResult.data ?? []) as unknown as AddressRow[];
  const phoneRows = (phonesResult.data ?? []) as unknown as PhoneRow[];

  const customers: CustomerListRow[] = ((profiles ?? []) as { id: string; first_name: string | null; last_name: string | null }[]).map(
    (p) => {
      const custOrders = orderRows
        .filter((o) => o.customer_id === p.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const orderHistory: CustomerOrderRow[] = custOrders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        created_at: o.created_at,
        status: o.status,
        total: o.final_price ?? 0,
      }));
      const totalSpent = custOrders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.final_price ?? 0), 0);
      return {
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "—",
        orderCount: custOrders.length,
        totalSpent,
        lastOrderDate: custOrders[0]?.created_at ?? null,
        addresses: showAddressesPhones ? addressRows.filter((a) => a.customer_id === p.id) : null,
        phones: showAddressesPhones ? phoneRows.filter((ph) => ph.customer_id === p.id) : null,
        orders: orderHistory,
      };
    },
  );

  customers.sort((a, b) => b.orderCount - a.orderCount);

  const backParams = new URLSearchParams({ tab: "customers", period });
  if (period === "custom") {
    if (customFrom) backParams.set("from", customFrom);
    if (customTo) backParams.set("to", customTo);
  }

  return (
    <CustomersListContent
      customers={customers}
      locale={locale as "en" | "ar"}
      backHref={`/admin/analytics?${backParams.toString()}`}
      showAddressesPhones={showAddressesPhones}
    />
  );
}
