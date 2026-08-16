import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { PromoCodesPageContent } from "@/components/admin/promoCodes/PromoCodesPageContent";

export default async function AdminPromoCodesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const [{ data: promoCodes, error: promoCodesError }, { data: redemptions, error: redemptionsError }] = await Promise.all([
    supabase
      .from("promo_codes")
      .select("id, code, discount_type, discount_value, min_order_amount, expiry_date, redemption_cap, active, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("promo_code_redemptions").select("promo_code_id"),
  ]);

  if (promoCodesError) throw promoCodesError;
  if (redemptionsError) throw redemptionsError;

  const redemptionCounts: Record<string, number> = {};
  for (const row of redemptions ?? []) {
    redemptionCounts[row.promo_code_id] = (redemptionCounts[row.promo_code_id] ?? 0) + 1;
  }

  return <PromoCodesPageContent initialPromoCodes={promoCodes ?? []} redemptionCounts={redemptionCounts} />;
}
