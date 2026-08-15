"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { InputField } from "@/components/storefront/InputField";
import { ToggleChip } from "@/components/storefront/ToggleChip";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import type { PendingSignupData } from "@/types/auth";

const MAX_ADDRESSES = 5;
const MAX_PHONES = 5;
const MIN_PASSWORD_LENGTH = 8;

type ContactMethod = "call" | "whatsapp" | "both";
type AddressEntry = { id: string; label: string; address: string; apartment: string };
type PhoneEntry = { id: string; phone: string; contactMethod: ContactMethod };

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const t = useTranslations("Register");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, loading } = useSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get("confirmError") ? t("errorGeneric") : null,
  );
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const fieldErrors: Record<string, string> = {};
  if (!firstName.trim()) fieldErrors.firstName = t("errorRequired");
  if (!lastName.trim()) fieldErrors.lastName = t("errorRequired");
  if (!email.trim()) fieldErrors.email = t("errorRequired");
  else if (!emailValid) fieldErrors.email = t("errorEmailInvalid");
  if (!password) fieldErrors.password = t("errorRequired");
  else if (password.length < MIN_PASSWORD_LENGTH) fieldErrors.password = t("errorPasswordTooShort");
  if (!confirmPassword) fieldErrors.confirmPassword = t("errorRequired");
  else if (password !== confirmPassword) fieldErrors.confirmPassword = t("errorPasswordMismatch");
  for (const entry of addresses) {
    if (!entry.label.trim()) fieldErrors[`address-label-${entry.id}`] = t("errorRequired");
    if (!entry.address.trim()) fieldErrors[`address-address-${entry.id}`] = t("errorRequired");
  }
  for (const entry of phones) {
    if (!entry.phone.trim()) fieldErrors[`phone-${entry.id}`] = t("errorRequired");
  }

  const fieldOrder = [
    "firstName",
    "lastName",
    "email",
    "password",
    "confirmPassword",
    ...addresses.flatMap((entry) => [`address-label-${entry.id}`, `address-address-${entry.id}`]),
    ...phones.map((entry) => `phone-${entry.id}`),
  ];
  const fieldError = (id: string) => (attempted ? fieldErrors[id] : undefined);

  // Already logged in — this page makes no sense to show, redirect home.
  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  function addAddress() {
    if (addresses.length >= MAX_ADDRESSES) return;
    setAddresses((list) => [...list, { id: crypto.randomUUID(), label: "", address: "", apartment: "" }]);
  }

  function updateAddress(id: string, patch: Partial<AddressEntry>) {
    setAddresses((list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removeAddress(id: string) {
    setAddresses((list) => list.filter((entry) => entry.id !== id));
  }

  function addPhone() {
    if (phones.length >= MAX_PHONES) return;
    setPhones((list) => [...list, { id: crypto.randomUUID(), phone: "", contactMethod: "call" }]);
  }

  function updatePhone(id: string, patch: Partial<PhoneEntry>) {
    setPhones((list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removePhone(id: string) {
    setPhones((list) => list.filter((entry) => entry.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setAttempted(true);

    const firstErrorId = fieldOrder.find((id) => fieldErrors[id]);
    if (firstErrorId) {
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, locale },
        emailRedirectTo: `${window.location.origin}/${locale}/register/complete`,
      },
    });
    setSubmitting(false);

    if (error) {
      // Logged for debugging — Supabase's client-facing error message is
      // often generic ("Database error saving new user", a failed Send
      // Email hook, etc.) and worth checking in devtools/Edge Function logs.
      console.error("signUp error:", error);
      setErrorMessage(error.message.toLowerCase().includes("already") ? t("errorEmailInUse") : t("errorGeneric"));
      return;
    }

    // With "Enable email confirmations" OFF (temporary, pre-domain setup —
    // see ARCHITECTURE.md), signUp() returns an active session immediately
    // and there's no confirmation link to wait for, so sync addresses/phones
    // right away instead of stashing them for /register/complete.
    if (data.session) {
      if (addresses.length > 0 || phones.length > 0) {
        await Promise.all([
          ...addresses.map((entry) =>
            supabase.from("customer_addresses").insert({
              customer_id: data.session!.user.id,
              label: entry.label,
              address: entry.address,
              apartment: entry.apartment || null,
            }),
          ),
          ...phones.map((entry) =>
            supabase.from("customer_phones").insert({
              customer_id: data.session!.user.id,
              phone: entry.phone,
              contact_method: entry.contactMethod,
            }),
          ),
        ]);
      }
      router.replace("/");
      router.refresh();
      return;
    }

    if (addresses.length > 0 || phones.length > 0) {
      const pending: PendingSignupData = {
        addresses: addresses.map(({ label, address, apartment }) => ({ label, address, apartment })),
        phones: phones.map(({ phone, contactMethod }) => ({ phone, contactMethod })),
      };
      sessionStorage.setItem("ycakes_pending_signup", JSON.stringify(pending));
    }

    setSubmittedEmail(email);
  }

  if (loading || session) {
    return (
      <main className="flex flex-col bg-bg-page">
        <NavBar />
      </main>
    );
  }

  if (submittedEmail) {
    return (
      <main className="flex flex-col bg-bg-page">
        <NavBar />
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-3xl bg-bg-surface p-8 text-center">
            <h1 className="font-heading text-2xl font-extrabold text-brand-primary">
              {t("confirmEmailTitle")}
            </h1>
            <p className="text-sm text-text-secondary">{t("confirmEmailBody", { email: submittedEmail })}</p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-1 justify-center px-4 py-10 md:py-16">
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-[520px] flex-col gap-5 rounded-3xl bg-bg-surface p-6 md:p-8"
        >
          <h1 className="text-center font-heading text-3xl font-extrabold text-brand-primary">{t("title")}</h1>
          <p className="text-center text-sm text-text-secondary">{t("subtitle")}</p>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <div className="flex gap-3">
            <InputField
              id="firstName"
              label={t("firstName")}
              placeholder={t("firstNamePlaceholder")}
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
              error={fieldError("firstName")}
            />
            <InputField
              id="lastName"
              label={t("lastName")}
              placeholder={t("lastNamePlaceholder")}
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
              error={fieldError("lastName")}
            />
          </div>

          <InputField
            id="email"
            label={t("email")}
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            error={fieldError("email")}
          />
          <InputField
            id="password"
            label={t("password")}
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={fieldError("password")}
          />
          <InputField
            id="confirmPassword"
            label={t("confirmPassword")}
            type="password"
            placeholder={t("confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            error={fieldError("confirmPassword")}
          />

          <p className="font-heading text-lg font-semibold text-brand-primary">{t("addressesHeading")}</p>
          {addresses.map((entry, index) => (
            <div key={entry.id} className="flex flex-col gap-2 rounded-2xl bg-bg-subtle p-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-secondary">
                  {t("addressEntryTitle", { n: index + 1 })}
                </p>
                <button
                  type="button"
                  onClick={() => removeAddress(entry.id)}
                  className="flex items-center gap-1 text-sm text-red-700"
                >
                  {t("remove")}
                </button>
              </div>
              <InputField
                id={`address-label-${entry.id}`}
                label={t("addressLabel")}
                placeholder={t("addressLabelPlaceholder")}
                value={entry.label}
                onChange={(value) => updateAddress(entry.id, { label: value })}
                error={fieldError(`address-label-${entry.id}`)}
              />
              <InputField
                id={`address-address-${entry.id}`}
                label={t("addressAddress")}
                value={entry.address}
                onChange={(value) => updateAddress(entry.id, { address: value })}
                error={fieldError(`address-address-${entry.id}`)}
              />
              <InputField
                label={t("addressApartment")}
                value={entry.apartment}
                onChange={(value) => updateAddress(entry.id, { apartment: value })}
              />
            </div>
          ))}
          {addresses.length < MAX_ADDRESSES && (
            <Button type="button" variant="brand-ghost" onClick={addAddress}>
              {t("addAddress", { count: addresses.length, max: MAX_ADDRESSES })}
            </Button>
          )}

          <p className="font-heading text-lg font-semibold text-brand-primary">{t("phonesHeading")}</p>
          {phones.map((entry, index) => (
            <div key={entry.id} className="flex flex-col gap-2 rounded-2xl bg-bg-subtle p-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-secondary">
                  {t("phoneEntryTitle", { n: index + 1 })}
                </p>
                <button
                  type="button"
                  onClick={() => removePhone(entry.id)}
                  className="flex items-center gap-1 text-sm text-red-700"
                >
                  {t("remove")}
                </button>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <InputField
                    id={`phone-${entry.id}`}
                    label=""
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    value={entry.phone}
                    onChange={(value) => updatePhone(entry.id, { phone: value })}
                    error={fieldError(`phone-${entry.id}`)}
                  />
                </div>
                <div className="flex gap-1.5 pb-3">
                  {(["call", "whatsapp", "both"] as const).map((method) => (
                    <ToggleChip
                      key={method}
                      label={tCommon(`contactMethod.${method}`)}
                      selected={entry.contactMethod === method}
                      onClick={() => updatePhone(entry.id, { contactMethod: method })}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
          {phones.length < MAX_PHONES && (
            <Button type="button" variant="brand-ghost" onClick={addPhone}>
              {t("addPhone", { count: phones.length, max: MAX_PHONES })}
            </Button>
          )}

          <Button type="submit" variant="brand-primary" size="xl" disabled={submitting}>
            {t("createAccount")}
          </Button>

          <p className="flex items-center justify-center gap-1 text-sm text-text-secondary">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-brand-primary underline">
              {t("logIn")}
            </Link>
          </p>
        </form>
      </div>
      <Footer />
    </main>
  );
}
