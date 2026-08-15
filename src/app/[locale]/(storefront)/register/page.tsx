"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { InputField } from "@/components/storefront/InputField";
import { ToggleChip } from "@/components/storefront/ToggleChip";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get("confirmError") ? t("errorGeneric") : null,
  );
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

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

    if (password !== confirmPassword) {
      setErrorMessage(t("errorPasswordMismatch"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(t("errorPasswordTooShort"));
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, locale },
        emailRedirectTo: `${window.location.origin}/${locale}/register/complete`,
      },
    });
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message.toLowerCase().includes("already") ? t("errorEmailInUse") : t("errorGeneric"));
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
              label={t("firstName")}
              placeholder={t("firstNamePlaceholder")}
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
            />
            <InputField
              label={t("lastName")}
              placeholder={t("lastNamePlaceholder")}
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
            />
          </div>

          <InputField
            label={t("email")}
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <InputField
            label={t("password")}
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <InputField
            label={t("confirmPassword")}
            type="password"
            placeholder={t("confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
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
                label={t("addressLabel")}
                placeholder={t("addressLabelPlaceholder")}
                value={entry.label}
                onChange={(value) => updateAddress(entry.id, { label: value })}
              />
              <InputField
                label={t("addressAddress")}
                value={entry.address}
                onChange={(value) => updateAddress(entry.id, { address: value })}
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
                    label=""
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    value={entry.phone}
                    onChange={(value) => updatePhone(entry.id, { phone: value })}
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
