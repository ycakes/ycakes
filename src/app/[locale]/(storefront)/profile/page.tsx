"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { ProfileInfoCard } from "@/components/storefront/ProfileInfoCard";
import { SavedAddressesCard } from "@/components/storefront/SavedAddressesCard";
import { SavedPhonesCard } from "@/components/storefront/SavedPhonesCard";
import { OrderHistoryList } from "@/components/storefront/OrderHistoryList";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import type { SavedAddress, SavedPhone } from "@/types/auth";
import type { OrderHistoryRow } from "@/types/orders";

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const router = useRouter();
  const { session, loading } = useSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [phones, setPhones] = useState<SavedPhone[]>([]);
  const [orders, setOrders] = useState<OrderHistoryRow[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;
    const supabase = createClient();

    async function load() {
      if (!session) return;
      const [profileRes, addressRes, phoneRes, orderRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name").eq("id", session.user.id).single(),
        supabase.from("customer_addresses").select("id, label, address, apartment").order("created_at"),
        supabase.from("customer_phones").select("id, phone, contact_method").order("created_at"),
        supabase
          .from("orders")
          .select("id, order_number, status, created_at, subtotal_estimate, final_price, order_items(quantity, cakes(name))")
          .order("created_at", { ascending: false }),
      ]);

      if (profileRes.error) console.error("profile fetch error:", profileRes.error);
      if (addressRes.error) console.error("addresses fetch error:", addressRes.error);
      if (phoneRes.error) console.error("phones fetch error:", phoneRes.error);
      if (orderRes.error) console.error("orders fetch error:", orderRes.error);

      if (profileRes.data) {
        setFirstName(profileRes.data.first_name ?? "");
        setLastName(profileRes.data.last_name ?? "");
      }
      setAddresses((addressRes.data as SavedAddress[]) ?? []);
      setPhones((phoneRes.data as SavedPhone[]) ?? []);
      setOrders((orderRes.data as unknown as OrderHistoryRow[]) ?? []);
      setDataLoaded(true);
    }

    load();
  }, [session]);

  if (loading || !session || !dataLoaded) {
    return (
      <main className="flex flex-col bg-bg-page">
        <NavBar />
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-col gap-6 px-6 py-8 md:px-[100px]">
        <p className="text-[13px] text-text-secondary">
          <Link href="/">{t("breadcrumbHome")}</Link>
          {"  /  "}
          <span>{t("breadcrumbProfile")}</span>
        </p>
        <h1 className="font-heading text-3xl font-extrabold text-brand-primary md:text-[40px]">{t("title")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex w-full flex-col gap-4 lg:max-w-[400px] lg:shrink-0">
            <ProfileInfoCard
              session={session}
              firstName={firstName}
              lastName={lastName}
              onSaved={(newFirst, newLast) => {
                setFirstName(newFirst);
                setLastName(newLast);
              }}
            />
            <SavedAddressesCard customerId={session.user.id} addresses={addresses} onChange={setAddresses} />
            <SavedPhonesCard customerId={session.user.id} phones={phones} onChange={setPhones} />
          </div>

          <div className="flex w-full flex-col gap-3">
            <p className="font-heading text-2xl font-semibold text-text-primary">{t("orderHistoryTitle")}</p>
            <OrderHistoryList orders={orders} />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
