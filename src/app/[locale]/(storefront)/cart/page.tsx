import { CartPageContent } from "@/components/storefront/CartPageContent";
import { getBlockedDates, getDeliveryAreas } from "@/lib/catalog/queries";

export default async function CartPage() {
  const [deliveryAreas, blockedDates] = await Promise.all([getDeliveryAreas(), getBlockedDates()]);

  return <CartPageContent deliveryAreas={deliveryAreas} blockedDates={blockedDates} />;
}
