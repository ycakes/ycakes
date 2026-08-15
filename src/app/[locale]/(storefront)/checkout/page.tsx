import { CheckoutPageContent } from "@/components/storefront/CheckoutPageContent";
import { getBlockedDates, getDeliveryAreas } from "@/lib/catalog/queries";

export default async function CheckoutPage() {
  const [deliveryAreas, blockedDates] = await Promise.all([getDeliveryAreas(), getBlockedDates()]);

  return <CheckoutPageContent deliveryAreas={deliveryAreas} blockedDates={blockedDates} />;
}
