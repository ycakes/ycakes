import { PartyPopper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const t = await getTranslations("AdminPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || undefined;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        <PartyPopper className="size-8" />
      </span>
      <h1 className="font-heading text-3xl font-bold text-brand-primary">
        {name ? t("titleNamed", { name }) : t("titleGeneric")}
      </h1>
      <p className="max-w-md text-text-secondary">{t("description")}</p>
    </main>
  );
}
