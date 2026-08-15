"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { InputField } from "@/components/storefront/InputField";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import type { SavedAddress, SavedPhone } from "@/types/auth";

type AuthTab = "guest" | "login" | "register";

// Guest / Log In / Register 3-way switcher (or, once logged in, a saved
// chip picker instead) — see ARCHITECTURE.md's Checkout section. Switching
// tabs never touches Contact Details state (owned by the parent); this
// component only ever *adds* pre-fill data via onUseAddress/onUsePhone,
// never overwrites anything the customer already typed.
export function CheckoutAuthCard({
  locale,
  onUseAddress,
  onUsePhone,
}: {
  locale: string;
  onUseAddress: (address: SavedAddress) => void;
  onUsePhone: (phone: SavedPhone) => void;
}) {
  const t = useTranslations("Checkout");
  const { session } = useSession();
  const [tab, setTab] = useState<AuthTab>("guest");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regAwaitingConfirm, setRegAwaitingConfirm] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedPhones, setSavedPhones] = useState<SavedPhone[]>([]);

  useEffect(() => {
    // No explicit reset-to-[] on logout: the saved-chips UI below only
    // ever renders inside the `if (session)` branch, so a stale array
    // sitting unused in state when logged out doesn't affect anything.
    if (!session) return;
    const supabase = createClient();
    supabase
      .from("customer_addresses")
      .select("id, label, address, apartment")
      .order("created_at")
      .then(({ data }) => setSavedAddresses((data as SavedAddress[]) ?? []));
    supabase
      .from("customer_phones")
      .select("id, phone, contact_method")
      .order("created_at")
      .then(({ data }) => setSavedPhones((data as SavedPhone[]) ?? []));
  }, [session]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoginSubmitting(false);
    if (error) {
      console.error("signIn error:", error);
      setLoginError(
        error.message.toLowerCase().includes("invalid") ? t("errorInvalidCredentials") : t("errorGeneric"),
      );
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);

    if (regPassword !== regConfirmPassword) {
      setRegError(t("errorPasswordMismatch"));
      return;
    }
    if (regPassword.length < 8) {
      setRegError(t("errorPasswordTooShort"));
      return;
    }

    setRegSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { first_name: regFirstName, last_name: regLastName, locale },
        emailRedirectTo: `${window.location.origin}/${locale}/register/complete`,
      },
    });
    setRegSubmitting(false);

    if (error) {
      console.error("signUp error:", error);
      setRegError(error.message.toLowerCase().includes("already") ? t("errorEmailInUse") : t("errorGeneric"));
      return;
    }

    // With email confirmations off, data.session is already active — the
    // useSession() subscription above picks it up and this card switches to
    // the logged-in view on its own re-render.
    if (!data.session) {
      setRegAwaitingConfirm(true);
    }
  }

  if (session) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">{t("loggedInAs", { email: session.user.email ?? "" })}</p>
        {savedAddresses.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-text-secondary">{t("savedAddresses")}</p>
            {savedAddresses.map((address) => (
              <div
                key={address.id}
                className="flex items-center justify-between rounded-2xl bg-bg-subtle px-3.5 py-2.5 text-[13px]"
              >
                <p className="text-text-primary">
                  {address.label} — {address.address}
                  {address.apartment ? `, ${address.apartment}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => onUseAddress(address)}
                  className="shrink-0 font-semibold text-brand-primary underline"
                >
                  {t("useThis")}
                </button>
              </div>
            ))}
          </div>
        )}
        {savedPhones.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-text-secondary">{t("savedPhones")}</p>
            {savedPhones.map((phone) => (
              <div
                key={phone.id}
                className="flex items-center justify-between rounded-2xl bg-bg-subtle px-3.5 py-2.5 text-[13px]"
              >
                <p className="text-text-primary">{phone.phone}</p>
                <button
                  type="button"
                  onClick={() => onUsePhone(phone)}
                  className="shrink-0 font-semibold text-brand-primary underline"
                >
                  {t("useThis")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full gap-1 rounded-full bg-bg-subtle p-1">
        {(["guest", "login", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-full px-3 py-2.5 text-sm font-semibold",
              tab === value ? "bg-brand-primary text-text-on-brand" : "text-text-primary",
            )}
          >
            {t(`tab.${value}`)}
          </button>
        ))}
      </div>

      {tab === "login" && (
        <form onSubmit={handleLogin} className="flex flex-col gap-2">
          <div className="flex gap-3">
            <InputField
              label={t("email")}
              type="email"
              value={loginEmail}
              onChange={setLoginEmail}
              autoComplete="email"
            />
            <InputField
              label={t("password")}
              type="password"
              value={loginPassword}
              onChange={setLoginPassword}
              autoComplete="current-password"
            />
          </div>
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <Button type="submit" variant="brand-primary" disabled={loginSubmitting}>
            {t("tab.login")}
          </Button>
        </form>
      )}

      {tab === "register" && (
        <>
          {regAwaitingConfirm ? (
            <p className="text-sm text-text-secondary">{t("confirmEmailBody", { email: regEmail })}</p>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-2">
              <div className="flex gap-3">
                <InputField label={t("firstName")} value={regFirstName} onChange={setRegFirstName} />
                <InputField label={t("lastName")} value={regLastName} onChange={setRegLastName} />
              </div>
              <InputField
                label={t("email")}
                type="email"
                value={regEmail}
                onChange={setRegEmail}
                autoComplete="email"
              />
              <div className="flex gap-3">
                <InputField
                  label={t("password")}
                  type="password"
                  value={regPassword}
                  onChange={setRegPassword}
                  autoComplete="new-password"
                />
                <InputField
                  label={t("confirmPassword")}
                  type="password"
                  value={regConfirmPassword}
                  onChange={setRegConfirmPassword}
                  autoComplete="new-password"
                />
              </div>
              {regError && <p className="text-sm text-red-600">{regError}</p>}
              <Button type="submit" variant="brand-primary" disabled={regSubmitting}>
                {t("tab.register")}
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
