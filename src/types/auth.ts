export type ContactMethod = "call" | "whatsapp" | "both";

// Held in sessionStorage between signUp() and email confirmation (no
// authenticated session exists yet to write customer_addresses/phones
// against at signup time) — see ARCHITECTURE.md's "Auth (Phase 4)" section.
export type PendingSignupData = {
  addresses: { label: string; address: string; apartment: string }[];
  phones: { phone: string; contactMethod: ContactMethod }[];
};

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  apartment: string | null;
};

export type SavedPhone = {
  id: string;
  phone: string;
  contact_method: ContactMethod;
};
