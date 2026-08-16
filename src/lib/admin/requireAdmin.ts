import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export async function requireAdmin(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect({ href: "/", locale });
  }

  return profile!;
}

// Orders (list + detail) are the one admin area accountants also need —
// read-only, per ARCHITECTURE.md's Roles section. Every other /admin route
// stays admin-only via requireAdmin above, called again by those pages
// individually since the shared layout now only gates on "is staff at all".
export async function requireStaff(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "accountant")) {
    redirect({ href: "/", locale });
  }

  return profile! as typeof profile & { role: "admin" | "accountant" };
}
