"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PendingSignupData } from "@/types/auth";

const PENDING_SIGNUP_KEY = "ycakes_pending_signup";

export default function RegisterCompletePage() {
  const t = useTranslations("RegisterComplete");
  const router = useRouter();
  const [status, setStatus] = useState<"syncing" | "noSession">("syncing");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setStatus("noSession");
        return;
      }

      const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
      if (raw) {
        try {
          const pending: PendingSignupData = JSON.parse(raw);
          await Promise.all([
            ...pending.addresses.map((entry) =>
              supabase.from("customer_addresses").insert({
                customer_id: session.user.id,
                label: entry.label,
                address: entry.address,
                apartment: entry.apartment || null,
              }),
            ),
            ...pending.phones.map((entry) =>
              supabase.from("customer_phones").insert({
                customer_id: session.user.id,
                phone: entry.phone,
                contact_method: entry.contactMethod,
              }),
            ),
          ]);
        } catch {
          // Best-effort sync — addresses/phones can always be added later
          // from the Profile page if this fails.
        }
        sessionStorage.removeItem(PENDING_SIGNUP_KEY);
      }

      if (!cancelled) router.replace("/");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        {status === "syncing" ? (
          <p className="text-text-secondary">{t("syncing")}</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-text-secondary">{t("noSession")}</p>
            <Link href="/login" className="font-semibold text-brand-primary underline">
              {t("logIn")}
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
