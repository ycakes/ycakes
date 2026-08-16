"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { InputField } from "@/components/storefront/InputField";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";

export default function LoginPage() {
  const t = useTranslations("Login");
  const router = useRouter();
  const { session, loading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Already logged in — this page makes no sense to show, redirect home.
  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setSubmitting(false);
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage(t("errorEmailNotConfirmed"));
      } else if (error.message.toLowerCase().includes("invalid")) {
        setErrorMessage(t("errorInvalidCredentials"));
      } else {
        setErrorMessage(t("errorGeneric"));
      }
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    setSubmitting(false);

    router.replace(profile?.role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  if (loading || session) {
    return (
      <main className="flex flex-col bg-bg-page">
        <NavBar />
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-1 justify-center px-4 py-10 md:py-16">
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl bg-bg-surface p-6 md:p-8"
        >
          <h1 className="text-center font-heading text-3xl font-extrabold text-brand-primary">{t("title")}</h1>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

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
            autoComplete="current-password"
          />

          {/* Not wired to a flow yet — open item, see ARCHITECTURE.md */}
          <span className="self-end text-[13px] font-semibold text-text-secondary/60">{t("forgotPassword")}</span>

          <Button type="submit" variant="brand-primary" size="xl" disabled={submitting}>
            {t("logIn")}
          </Button>

          <p className="flex items-center justify-center gap-1 text-sm text-text-secondary">
            {t("newToYcakes")}{" "}
            <Link href="/register" className="font-semibold text-brand-primary underline">
              {t("createAccount")}
            </Link>
          </p>
        </form>
      </div>
      <Footer />
    </main>
  );
}
