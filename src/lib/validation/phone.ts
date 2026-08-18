// Shared across Checkout, New Order, and Order Detail's contact editor: a
// phone number (digits only, optional leading +) must be 11–15 digits —
// short enough to reject obvious typos, long enough to cover Egyptian
// mobile numbers (+20 1xx xxx xxxx = 13 digits with the country code, 11
// without it) and other international formats an admin might enter.
const PHONE_REGEX = /^\+?\d{11,15}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}
