import { useTranslations } from "next-intl";

export default function AdminHomePage() {
  const t = useTranslations("AdminPage");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
    </main>
  );
}
