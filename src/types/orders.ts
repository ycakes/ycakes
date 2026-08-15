import type { ContactMethod } from "./auth";

// What Order Confirmation renders. Guests have no DB read access to their
// own order (ARCHITECTURE.md: "visible only to admin"), so this is built
// from what Checkout already knows at submission time and handed off via
// sessionStorage — never re-fetched, for guests or logged-in customers
// alike (one code path instead of two).
export type OrderConfirmationSnapshot = {
  orderNumber: string;
  lineItems: {
    name: string;
    image: string | null;
    attributesSummary: string;
    quantity: number;
    lineEstimate: number;
  }[];
  fulfillmentMethod: "pickup" | "delivery";
  deliveryAreaName: string | null;
  fulfillmentDate: string;
  contactName: string;
  phone: string;
  phoneMethod: ContactMethod;
  address: string;
  total: number;
};
