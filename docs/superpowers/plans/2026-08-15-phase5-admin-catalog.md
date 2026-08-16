# Phase 5 — Admin Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin dashboard's catalog management area — Cakes, Categories, Sizes, Flavors, Colors, Toppers CRUD, with Cloudinary image upload wiring — so the owner can manage the storefront's product catalog without touching SQL.

**Architecture:** A new `admin/layout.tsx` gates every `/admin/*` route to `role === 'admin'` server-side, wraps children in a collapsible sidebar. Sizes/Flavors/Colors/Toppers share one `AdminTable` display component; Categories and Cakes get bespoke layouts. All catalog writes go through the browser Supabase client directly from client components — RLS (`admin_all` policies, already in place) is the real authorization boundary, the layout guard is UX. Image upload is a signed-Cloudinary flow: a Route Handler mints a signature server-side, the browser uploads directly to Cloudinary. Category reorder uses native HTML5 drag events, not a new drag-and-drop library.

**Tech Stack:** Next.js App Router (Server + Client Components), Supabase (Postgres/RLS/Auth), shadcn `select`/`switch` (base-nova style, already `@base-ui/react`-backed — no new UI dependency), lucide-react icons, next-intl, Cloudinary (signed upload via Node's built-in `crypto`, no `cloudinary` npm package).

**Spec:** `docs/superpowers/specs/2026-08-15-phase5-admin-catalog-design.md` — this plan implements it task-for-task; the two travel together.

## Global Constraints

- All money is EGP, `numeric(10,2)` (CLAUDE.md hard rule 7). No currency picker anywhere in these forms.
- Every UI surface (admin included) supports EN/AR + RTL (CLAUDE.md hard rule 6) — use `start-`/`end-`/`ps-`/`pe-` logical Tailwind properties, never hardcoded `left`/`right`; every user-facing string goes through next-intl (`messages/en.json` + `messages/ar.json`), never a bare literal.
- Bilingual product content (`name`, `description`) is `jsonb` shaped `{ "en": "...", "ar": "..." }` — forms edit both languages at once, following `src/types/catalog.ts`'s existing `Bilingual` type.
- **Never commit automatically** (CLAUDE.md hard rule 1). Every task ends by staging with `git add` and stopping. The human commits. The final task proposes one consolidated commit message.
- **Never run a dev server or open a browser to self-test** (CLAUDE.md hard rule 2). Verify with `npx tsc --noEmit` and `npm run lint` after each task; the human tests the UI manually.
- **No Supabase CLI and no authenticated Supabase MCP in this environment.** Every migration task writes the `.sql` file and stages it, then stops with an explicit instruction for the human to run `supabase db push` (or apply it via the dashboard SQL editor) themselves before the tasks that depend on the new columns/trigger will work end-to-end against real data. This mirrors ARCHITECTURE.md's documented workflow (`supabase db push` is the only sanctioned way schema reaches hosted — never hand-apply SQL outside a migration file).
- **No new drag-and-drop dependency.** Category reorder uses native HTML5 `draggable`/`onDragStart`/`onDragOver`/`onDrop`, not `dnd-kit` or similar (avoids an unflagged new dependency per CLAUDE.md hard rule 8).
- **No `cloudinary` npm package.** The upload signature is computed with Node's built-in `crypto` module (SHA-1 per Cloudinary's documented signing scheme) — one small function, not worth a dependency.
- Admin pages are reached at `/admin/...` under the existing `[locale]` segment — `(admin)` is a route-group name only, doesn't affect the URL (ARCHITECTURE.md's Folder structure section).
- Accountant role is **not** admitted to any `/admin/*` route this phase — Catalog is admin-only per ARCHITECTURE.md's Roles section; accountant's catalog access is DB-level read only, consumed by Phase 7 analytics, not this UI.

---

### Task 1: Schema migration — `toppers.image_url`, `cake_images.is_primary` + sync trigger

**Files:**
- Create: `supabase/migrations/20260815160000_phase5_admin_catalog.sql`
- Modify: `src/types/catalog.ts`
- Modify: `src/lib/catalog/queries.ts:266-276` (`getToppers`)

**Interfaces:**
- Produces: `public.toppers.image_url text` (nullable); `public.cake_images.is_primary boolean not null default false`; `public.fn_sync_cake_primary_image()` trigger function + `trg_sync_cake_primary_image` trigger; `CakeImage` type (`src/types/catalog.ts`); `Topper.image_url` field.

- [ ] **Step 1: Write the migration**

```sql
-- Toppers need a real photo (e.g. a graduation-hat topper shown as an
-- actual image in the Custom Cakes topper picker). TopperCard already
-- accepts an imageSrc prop that nothing has ever populated.
alter table public.toppers add column image_url text;

-- cake_images gains a primary flag; cakes.primary_image_url stays the
-- single denormalized column every existing storefront query reads
-- (ProductCard, Home, Cart, CakeCustomizer, OrderDetailModal) — this
-- trigger is the only thing that writes it from now on.
alter table public.cake_images add column is_primary boolean not null default false;

create or replace function public.fn_sync_cake_primary_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_primary then
    update public.cake_images
      set is_primary = false
      where cake_id = new.cake_id and id <> new.id and is_primary;
    update public.cakes set primary_image_url = new.url where id = new.cake_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_cake_primary_image
after insert or update of is_primary, url on public.cake_images
for each row execute function public.fn_sync_cake_primary_image();
```

- [ ] **Step 2: Stage the migration and stop for the human to push it**

```bash
git add supabase/migrations/20260815160000_phase5_admin_catalog.sql
```

Tell the human: "Migration staged at `supabase/migrations/20260815160000_phase5_admin_catalog.sql`. Please run `supabase db push` (or apply it via the Supabase dashboard SQL editor) before testing any Phase 5 admin page against real data — the rest of this plan's code assumes these columns/trigger exist." Do not proceed to Step 3 until you've noted this; the following code changes are safe to write regardless of whether the migration has been pushed yet (TypeScript doesn't know about DB state), but the human needs the heads-up now, not at the end.

- [ ] **Step 3: Update `src/types/catalog.ts`**

Add after the `Cake` type:

```typescript
export type CakeImage = {
  id: string;
  cake_id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
};
```

Update the `Topper` type to add the new column:

```typescript
export type Topper = {
  id: string;
  name: Bilingual;
  price_modifier: number;
  has_color_variants: boolean;
  image_url: string | null;
};
```

- [ ] **Step 4: Update `getToppers()` in `src/lib/catalog/queries.ts`**

Change the `.select()` call at line 269-270 from:
```typescript
    .select("id, name, price_modifier, has_color_variants")
```
to:
```typescript
    .select("id, name, price_modifier, has_color_variants, image_url")
```

- [ ] **Step 5: Wire the real image into the storefront topper picker**

Open `src/components/storefront/CakeCustomizer.tsx`, find the `TopperCard` usage (search for `<TopperCard`), and change its `imageSrc` prop from whatever it currently passes (likely `undefined` or missing) to `topper.image_url`. Read the surrounding ~15 lines first to match the existing prop-passing style exactly (e.g. `label={topper.name[locale]}` sibling prop).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. If `CakeCustomizer.tsx`'s topper-mapping code destructures `Topper` without `image_url`, TypeScript will not error (it's an added optional-shaped field, not a removed one) — this step just confirms nothing else broke.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260815160000_phase5_admin_catalog.sql src/types/catalog.ts src/lib/catalog/queries.ts src/components/storefront/CakeCustomizer.tsx
git commit -m "$(cat <<'EOF'
Add cake_images.is_primary sync trigger and toppers.image_url

Closes a real storefront gap (TopperCard had an unused imageSrc prop)
and lays the schema groundwork for Phase 5's multi-image cake upload.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Admin auth guard + layout shell + collapsible sidebar nav

**Files:**
- Create: `src/lib/admin/requireAdmin.ts`
- Create: `src/components/admin/AdminNavItem.tsx`
- Create: `src/components/admin/AdminSidebarNav.tsx`
- Modify: `src/app/[locale]/(admin)/admin/layout.tsx` (new file — none exists yet)
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Produces: `requireAdmin(): Promise<{ id: string; role: string }>` (redirects to `/login` or `/` on failure, never returns for a non-admin — callers can treat its return as "definitely an admin"); `AdminSidebarNav` (client component, no props — reads its own collapse state); `AdminNavItem` props `{ href: string | null; icon: LucideIcon; label: string; active: boolean }`.
- Consumes: `src/lib/supabase/server.ts`'s `createClient()`, `src/i18n/navigation.ts`'s `Link`/`usePathname`, `next/navigation`'s `redirect` is NOT used (this app uses locale-aware `redirect` from `next-intl/navigation` per the existing `Login`/`Register`/`Profile` pattern — check `src/app/[locale]/(storefront)/profile/page.tsx` for the exact redirect call shape before writing this).

- [ ] **Step 1: Read the existing session-gated page pattern**

Read `src/app/[locale]/(storefront)/profile/page.tsx` in full to see exactly how it checks for a session server-side and redirects. Match that pattern (same import source for `redirect`, same `createClient()` call shape) rather than inventing a new one.

- [ ] **Step 2: Write `src/lib/admin/requireAdmin.ts`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale: "en" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect({ href: "/", locale: "en" });
  }

  return profile!;
}
```

Before finalizing, check `src/i18n/navigation.ts`'s `redirect` signature (it's `createNavigation(routing)`'s `redirect`, which in next-intl v4 needs a `locale` — check whether the existing `Profile`/`Checkout` server-side redirects pass one explicitly or rely on request context). Adjust the two `redirect(...)` calls above to match whatever signature `src/app/[locale]/(storefront)/profile/page.tsx` actually uses (read in Step 1) — do not guess; copy its exact call shape, including how it derives the current locale (likely a `locale` param already available in the calling Server Component/layout, passed through rather than hardcoded `"en"`). This function will be called from `admin/layout.tsx`, which receives `params: Promise<{ locale: string }>` same as every other `[locale]` layout — thread that locale through as a parameter:

```typescript
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
    .select("id, role")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect({ href: "/", locale });
  }

  return profile!;
}
```

- [ ] **Step 3: Write `AdminNavItem`**

```tsx
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminNavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string | null;
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const content = (
    <span
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-primary text-text-on-brand"
          : href
            ? "text-text-primary hover:bg-bg-surface-alt"
            : "cursor-not-allowed text-text-secondary/50",
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </span>
  );

  if (!href) return <div title={collapsed ? label : undefined}>{content}</div>;

  return (
    <Link href={href} title={collapsed ? label : undefined}>
      {content}
    </Link>
  );
}
```

- [ ] **Step 4: Write `AdminSidebarNav`**

```tsx
"use client";

import { useState } from "react";
import {
  Cake,
  FolderTree,
  Ruler,
  IceCreamCone,
  Palette,
  PartyPopper,
  ShoppingBag,
  Wallet,
  Users,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { AdminNavItem } from "./AdminNavItem";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

export function AdminSidebarNav() {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const catalogItems = [
    { href: "/admin/cakes", icon: Cake, label: t("cakes") },
    { href: "/admin/categories", icon: FolderTree, label: t("categories") },
    { href: "/admin/sizes", icon: Ruler, label: t("sizes") },
    { href: "/admin/flavors", icon: IceCreamCone, label: t("flavors") },
    { href: "/admin/colors", icon: Palette, label: t("colors") },
    { href: "/admin/toppers", icon: PartyPopper, label: t("toppers") },
  ];

  const futureItems = [
    { icon: ShoppingBag, label: t("orders") },
    { icon: Wallet, label: t("money") },
    { icon: Users, label: t("team") },
  ];

  return (
    <aside
      className={
        collapsed
          ? "flex h-full w-[76px] shrink-0 flex-col gap-6 border-e border-border-default bg-bg-surface p-3"
          : "flex h-full w-64 shrink-0 flex-col gap-6 border-e border-border-default bg-bg-surface p-4"
      }
    >
      <div className="flex items-center justify-between">
        {!collapsed && <span className="font-heading text-lg font-bold text-brand-primary">YCakes</span>}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={t("toggleSidebar")}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-alt"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {!collapsed && (
          <p className="px-3 pb-1 text-xs font-semibold uppercase text-text-secondary/70">
            {t("catalog")}
          </p>
        )}
        {catalogItems.map((item) => (
          <AdminNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname.startsWith(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <nav className="flex flex-col gap-1">
        {futureItems.map((item) => (
          <AdminNavItem
            key={item.label}
            href={null}
            icon={item.icon}
            label={item.label}
            active={false}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <button
        type="button"
        onClick={async () => {
          await createClient().auth.signOut();
          router.push("/");
        }}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-surface-alt"
      >
        <LogOut className="size-5 shrink-0" />
        {!collapsed && <span>{t("logOut")}</span>}
      </button>
    </aside>
  );
}
```

- [ ] **Step 5: Write `admin/layout.tsx`**

```tsx
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);

  return (
    <div className="flex min-h-screen bg-bg-page">
      <AdminSidebarNav />
      <div className="flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
```

- [ ] **Step 6: Add translation keys**

In `messages/en.json`, add a new top-level `"Admin"` key (place it near `"AdminPage"`):

```json
"Admin": {
  "nav": {
    "catalog": "Catalog",
    "cakes": "Cakes",
    "categories": "Categories",
    "sizes": "Sizes",
    "flavors": "Flavors",
    "colors": "Colors",
    "toppers": "Toppers",
    "orders": "Orders",
    "money": "Money",
    "team": "Team",
    "toggleSidebar": "Toggle sidebar",
    "logOut": "Log Out"
  }
}
```

In `messages/ar.json`, add the matching Arabic block in the same shape:

```json
"Admin": {
  "nav": {
    "catalog": "الكتالوج",
    "cakes": "الكيكات",
    "categories": "الفئات",
    "sizes": "الأحجام",
    "flavors": "النكهات",
    "colors": "الألوان",
    "toppers": "الإضافات",
    "orders": "الطلبات",
    "money": "الحسابات",
    "team": "الفريق",
    "toggleSidebar": "تبديل الشريط الجانبي",
    "logOut": "تسجيل الخروج"
  }
}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. If `requireAdmin`'s `redirect()` call shape doesn't match what Step 2 assumed, fix it now based on what Step 1 found — this is exactly the kind of mismatch type-checking will surface.

- [ ] **Step 8: Commit**

```bash
git add src/lib/admin/requireAdmin.ts src/components/admin/AdminNavItem.tsx src/components/admin/AdminSidebarNav.tsx "src/app/[locale]/(admin)/admin/layout.tsx" messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add admin route guard and collapsible sidebar shell

/admin/* now redirects non-admins away server-side. Sidebar groups
Catalog (active) and Orders/Money/Team (disabled placeholders) per
the Figma design session.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Shared UI primitives — `Select`, `Switch`, `RowActions`, `AdminTable`

**Files:**
- Create (via shadcn CLI): `src/components/ui/select.tsx`
- Create (via shadcn CLI): `src/components/ui/switch.tsx`
- Create: `src/components/admin/RowActions.tsx`
- Create: `src/components/admin/AdminTable.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Produces: `AdminTable<T>` props `{ columns: AdminTableColumn<T>[]; rows: T[]; getRowId: (row: T) => string; emptyMessage: string }` where `AdminTableColumn<T> = { header: string; sortable?: boolean; sortKey?: string; render: (row: T) => React.ReactNode }`; `RowActions` props `{ onEdit: () => void; onDelete: () => void; editLabel: string; deleteLabel: string }`.
- Consumes: `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`), `Button` (`src/components/ui/button.tsx`).

- [ ] **Step 1: Install shadcn Select and Switch**

Run: `npx shadcn@latest add select switch`
Expected: creates `src/components/ui/select.tsx` and `src/components/ui/switch.tsx`, matching the existing `base-nova` style config in `components.json` (same `@base-ui/react` foundation as `Button`, no new heavy dependency). If the CLI prompts interactively, answer with the defaults already locked in `components.json` (don't let it rewrite `tailwind.config` or `globals.css` wholesale — review the diff after and revert anything beyond the two new component files plus, at most, additive CSS variables).

- [ ] **Step 2: Verify the install didn't touch unrelated files**

Run: `git status`
Expected: only `src/components/ui/select.tsx`, `src/components/ui/switch.tsx`, and possibly `package.json`/`package-lock.json` (if the CLI needed a peer dep already covered by `@base-ui/react`) are new/modified. If `globals.css` or `components.json` changed, read the diff and revert anything that isn't strictly required for these two components (`git checkout -- <file>` on the unwanted parts, or hand-edit back).

- [ ] **Step 3: Write `RowActions`**

```tsx
"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslations } from "next-intl";

export function RowActions({
  onEdit,
  onDelete,
  itemLabel,
}: {
  onEdit: () => void;
  onDelete: () => void;
  itemLabel: string;
}) {
  const t = useTranslations("Admin.table");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("edit")}
        onClick={onEdit}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("delete")}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t("deleteTitle")}
        message={t("deleteMessage", { item: itemLabel })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
```

Before finalizing, read `src/components/ui/confirm-dialog.tsx` (already read during design) to confirm `message` is a plain string prop, not something `next-intl`'s `t()` can interpolate a `{item}` placeholder into automatically — `t("deleteMessage", { item: itemLabel })` is next-intl's own interpolation (the message string in JSON should contain `{item}`), so this is correct as long as the JSON key is written with that placeholder (Step 6 below does this).

- [ ] **Step 4: Write `AdminTable`**

```tsx
"use client";

import { Link } from "@/i18n/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTableColumn<T> = {
  header: string;
  render: (row: T) => React.ReactNode;
  sortKey?: string;
};

export function AdminTable<T>({
  columns,
  rows,
  getRowId,
  emptyMessage,
  sortKey,
  sortDir,
  sortBasePath,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage: string;
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
  sortBasePath?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-16 text-center text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-surface-alt text-start">
            {columns.map((col) => {
              const isSorted = sortBasePath && col.sortKey && sortKey === col.sortKey;
              const nextDir = isSorted && sortDir === "asc" ? "desc" : "asc";
              const header = (
                <span className="flex items-center gap-1">
                  {col.header}
                  {isSorted && (sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                </span>
              );
              return (
                <th key={col.header} className="p-3 text-start font-semibold text-text-primary">
                  {sortBasePath && col.sortKey ? (
                    <Link href={`${sortBasePath}?sort=${col.sortKey}&dir=${nextDir}`}>{header}</Link>
                  ) : (
                    header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)} className={cn("border-b border-border-default last:border-0 hover:bg-bg-surface-alt")}>
              {columns.map((col) => (
                <td key={col.header} className="p-3 align-middle text-text-primary">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Add translation keys**

In `messages/en.json`, extend the `"Admin"` block added in Task 2 with a sibling `"table"` key:

```json
"table": {
  "edit": "Edit",
  "delete": "Delete",
  "deleteTitle": "Delete this item?",
  "deleteMessage": "\"{item}\" will be permanently removed. This can't be undone.",
  "cancel": "Cancel",
  "active": "Active",
  "add": "Add",
  "save": "Save",
  "name": "Name",
  "nameEn": "Name (English)",
  "nameAr": "Name (Arabic)"
}
```

In `messages/ar.json`, matching:

```json
"table": {
  "edit": "تعديل",
  "delete": "حذف",
  "deleteTitle": "حذف هذا العنصر؟",
  "deleteMessage": "سيتم حذف \"{item}\" نهائيًا. لا يمكن التراجع عن هذا الإجراء.",
  "cancel": "إلغاء",
  "active": "مفعّل",
  "add": "إضافة",
  "save": "حفظ",
  "name": "الاسم",
  "nameEn": "الاسم (إنجليزي)",
  "nameAr": "الاسم (عربي)"
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/select.tsx src/components/ui/switch.tsx src/components/admin/RowActions.tsx src/components/admin/AdminTable.tsx messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add shared admin table, row actions, Select and Switch primitives

AdminTable drives Sizes/Flavors/Colors/Toppers list pages from one
implementation instead of four, per the Figma design session's note.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Signed Cloudinary upload — Route Handler + client helper + `ImageUploader`

**Files:**
- Create: `src/app/api/admin/cloudinary-signature/route.ts`
- Create: `src/lib/admin/cloudinaryUpload.ts`
- Create: `src/components/admin/ImageUploader.tsx`
- Modify: `.env.example`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Produces: `POST /api/admin/cloudinary-signature` → `{ signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string }`; `uploadToCloudinary(file: File, folder: string): Promise<string>` (returns the uploaded image's `secure_url`); `ImageUploader` props `{ images: { url: string; sort_order: number; is_primary: boolean }[]; onChange: (images: ...[]) => void; folder: string; multiple?: boolean }`.
- Consumes: `src/lib/supabase/server.ts`'s `createClient()` (to verify the caller is an admin before signing).

- [ ] **Step 1: Write the signature Route Handler**

```typescript
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { folder } = (await request.json()) as { folder: string };
  const timestamp = Math.round(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  // Cloudinary's documented signing scheme: sort every param (except
  // file/cloud_name/api_key/resource_type/signature itself) alphabetically,
  // join as key=value pairs with '&', append the API secret, SHA-1 it.
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(paramsToSign).digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  });
}
```

- [ ] **Step 2: Write the client upload helper**

```typescript
export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const sigResponse = await fetch("/api/admin/cloudinary-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });

  if (!sigResponse.ok) {
    throw new Error("Failed to get upload signature");
  }

  const { signature, timestamp, apiKey, cloudName } = (await sigResponse.json()) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const data = (await uploadResponse.json()) as { secure_url: string };
  return data.secure_url;
}
```

- [ ] **Step 3: Write `ImageUploader`**

Single-image mode (used by Toppers) shows one slot; multi mode (used by the Cake Form) shows a grid with reorder + primary-marking. Build multi as the general case, with `multiple={false}` collapsing it to one slot with no reorder/primary UI.

```tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Star, Trash2, Upload, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/admin/cloudinaryUpload";

export type UploadedImage = { url: string; sort_order: number; is_primary: boolean };

export function ImageUploader({
  images,
  onChange,
  folder,
  multiple = true,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  folder: string;
  multiple?: boolean;
}) {
  const t = useTranslations("Admin.imageUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToCloudinary(file, folder);
        uploaded.push({ url, sort_order: images.length + uploaded.length, is_primary: false });
      }
      const next = multiple ? [...images, ...uploaded] : uploaded.slice(0, 1);
      if (next.length > 0 && !next.some((img) => img.is_primary)) {
        next[0].is_primary = true;
      }
      onChange(next);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function setPrimary(url: string) {
    onChange(images.map((img) => ({ ...img, is_primary: img.url === url })));
  }

  function remove(url: string) {
    const next = images.filter((img) => img.url !== url).map((img, i) => ({ ...img, sort_order: i }));
    if (next.length > 0 && !next.some((img) => img.is_primary)) {
      next[0].is_primary = true;
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.url} className="group relative size-24 shrink-0 overflow-hidden rounded-xl border-[1.5px] border-border-default bg-bg-surface-alt">
            <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
            {multiple && (
              <button
                type="button"
                onClick={() => setPrimary(img.url)}
                aria-label={t("setPrimary")}
                className="absolute start-1 top-1 rounded-full bg-black/50 p-1"
              >
                <Star className={img.is_primary ? "size-3.5 fill-yellow-400 text-yellow-400" : "size-3.5 text-white"} />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(img.url)}
              aria-label={t("remove")}
              className="absolute end-1 top-1 rounded-full bg-black/50 p-1"
            >
              <Trash2 className="size-3.5 text-white" />
            </button>
          </div>
        ))}
        {(multiple || images.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-border-default text-text-secondary hover:bg-bg-surface-alt"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
            <span className="text-[11px]">{t("upload")}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add env var placeholders**

Append to `.env.example`:
```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- [ ] **Step 5: Add translation keys**

In `messages/en.json`, extend `"Admin"` with:
```json
"imageUploader": {
  "upload": "Upload",
  "setPrimary": "Set as primary",
  "remove": "Remove"
}
```

In `messages/ar.json`:
```json
"imageUploader": {
  "upload": "رفع صورة",
  "setPrimary": "تعيين كصورة رئيسية",
  "remove": "إزالة"
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Stop and tell the human**

This task needs real Cloudinary credentials to function end-to-end. Tell the human: "Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to `.env.local` (get them from your Cloudinary dashboard's home page) and to the Vercel project's environment variables before testing image upload." Do not ask for the values in chat.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/cloudinary-signature/route.ts src/lib/admin/cloudinaryUpload.ts src/components/admin/ImageUploader.tsx .env.example messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add signed Cloudinary upload wiring for admin catalog images

Route Handler mints a server-side signature (Node crypto, no
cloudinary SDK) after verifying the caller is an admin; browser
uploads directly to Cloudinary. Reused by Toppers (single image) and
the Cake Form (multi-image, primary marking) in later tasks.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Colors admin page

**Files:**
- Create: `src/app/[locale]/(admin)/admin/colors/page.tsx`
- Create: `src/components/admin/colors/ColorsPageContent.tsx`
- Create: `src/components/admin/colors/ColorFormDialog.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: `AdminTable`, `RowActions`, `Switch` (Task 3); `Color` type (`src/types/catalog.ts`).
- Produces: establishes the CRUD-page pattern (list fetch, `AdminTable` columns, Add/Edit `Dialog` form, delete via `RowActions`) that Tasks 6–7 (Flavors, Toppers) copy.

- [ ] **Step 1: Write `page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { ColorsPageContent } from "@/components/admin/colors/ColorsPageContent";
import type { Color } from "@/types/catalog";

export default async function AdminColorsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colors")
    .select("id, name, hex_code, active, sort_order")
    .order("sort_order");

  if (error) throw error;

  return <ColorsPageContent initialColors={data as (Color & { active: boolean; sort_order: number })[]} />;
}
```

- [ ] **Step 2: Write `ColorFormDialog`**

```tsx
"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type ColorFormValue = {
  id?: string;
  name_en: string;
  name_ar: string;
  hex_code: string;
};

export function ColorFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: ColorFormValue | null;
  onSave: (value: ColorFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const [nameEn, setNameEn] = useState(initialValue?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialValue?.name_ar ?? "");
  const [hex, setHex] = useState(initialValue?.hex_code ?? "#000000");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameEn")}
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameAr")}
              <input
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-3 text-[13px] font-medium text-text-primary">
              <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="size-9 rounded-lg border-[1.5px] border-border-default" />
              {hex}
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() => onSave({ id: initialValue?.id, name_en: nameEn, name_ar: nameAr, hex_code: hex })}
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 3: Write `ColorsPageContent`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ColorFormDialog, type ColorFormValue } from "./ColorFormDialog";
import type { Color } from "@/types/catalog";

type Row = Color & { active: boolean; sort_order: number };

export function ColorsPageContent({ initialColors }: { initialColors: Row[] }) {
  const t = useTranslations("Admin.table");
  const [colors, setColors] = useState(initialColors);
  const [editing, setEditing] = useState<ColorFormValue | null | undefined>(undefined);
  const supabase = createClient();

  async function refresh() {
    const { data } = await supabase.from("colors").select("id, name, hex_code, active, sort_order").order("sort_order");
    if (data) setColors(data as Row[]);
  }

  async function handleSave(value: ColorFormValue) {
    const payload = { name: { en: value.name_en, ar: value.name_ar }, hex_code: value.hex_code };
    if (value.id) {
      await supabase.from("colors").update(payload).eq("id", value.id);
    } else {
      await supabase.from("colors").insert({ ...payload, sort_order: colors.length });
    }
    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("colors").delete().eq("id", id);
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("colors").update({ active }).eq("id", id);
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
  }

  const columns: AdminTableColumn<Row>[] = [
    {
      header: t("name"),
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="size-5 shrink-0 rounded-full border border-border-default" style={{ backgroundColor: row.hex_code ?? undefined }} />
          {row.name.en} / {row.name.ar}
        </span>
      ),
    },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <RowActions
          itemLabel={row.name.en}
          onEdit={() =>
            setEditing({ id: row.id, name_en: row.name.en, name_ar: row.name.ar, hex_code: row.hex_code ?? "#000000" })
          }
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("colors")}</h1>
        <Button type="button" variant="brand-primary" onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      <AdminTable columns={columns} rows={colors} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <ColorFormDialog open={editing !== undefined} initialValue={editing ?? null} onSave={handleSave} onCancel={() => setEditing(undefined)} />
    </div>
  );
}
```

Note: `t("colors")` here reuses the `Admin.nav.colors` key by relying on `useTranslations("Admin.table")` scoping — that's wrong, `colors` isn't in the `table` namespace. Fix before committing: change the heading to `useTranslations("Admin.nav")` for that one string, or add a `"colors"` key under `Admin.table` too. Use the second approach (add `"colors": "Colors"` / `"الألوان"` to `Admin.table` in both message files) to keep this component single-namespace — simpler than juggling two `useTranslations` calls.

- [ ] **Step 4: Add the missing translation keys**

In `messages/en.json`'s `Admin.table`, add: `"colors": "Colors"`, `"noResults": "No results yet."`
In `messages/ar.json`'s `Admin.table`, add: `"colors": "الألوان"`, `"noResults": "لا توجد نتائج بعد."`

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(admin)/admin/colors/page.tsx" src/components/admin/colors messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Colors admin page (list, add/edit, active toggle, delete)

First concrete use of AdminTable/RowActions — establishes the CRUD
page pattern Flavors and Toppers reuse.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Flavors admin page

**Files:**
- Create: `src/app/[locale]/(admin)/admin/flavors/page.tsx`
- Create: `src/components/admin/flavors/FlavorsPageContent.tsx`
- Create: `src/components/admin/flavors/FlavorFormDialog.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: same shared pieces as Task 5. `Flavor` type has `price_modifier: number` instead of `hex_code`.

- [ ] **Step 1: Write `page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { FlavorsPageContent } from "@/components/admin/flavors/FlavorsPageContent";
import type { Flavor } from "@/types/catalog";

export default async function AdminFlavorsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flavors")
    .select("id, name, price_modifier, active, sort_order")
    .order("sort_order");

  if (error) throw error;

  return <FlavorsPageContent initialFlavors={data as (Flavor & { active: boolean; sort_order: number })[]} />;
}
```

- [ ] **Step 2: Write `FlavorFormDialog`**

Copy `src/components/admin/colors/ColorFormDialog.tsx`'s structure exactly, replacing the hex-code `<input type="color">` field with a price modifier field:

```tsx
"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type FlavorFormValue = {
  id?: string;
  name_en: string;
  name_ar: string;
  price_modifier: number;
};

export function FlavorFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: FlavorFormValue | null;
  onSave: (value: FlavorFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const [nameEn, setNameEn] = useState(initialValue?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialValue?.name_ar ?? "");
  const [priceModifier, setPriceModifier] = useState(String(initialValue?.price_modifier ?? 0));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameEn")}
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameAr")}
              <input
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("priceModifier")}
              <input
                type="number"
                step="0.01"
                value={priceModifier}
                onChange={(e) => setPriceModifier(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() =>
                onSave({
                  id: initialValue?.id,
                  name_en: nameEn,
                  name_ar: nameAr,
                  price_modifier: Number(priceModifier) || 0,
                })
              }
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 3: Write `FlavorsPageContent`**

Same structure as `ColorsPageContent`, swapping the swatch column for a price-modifier column:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FlavorFormDialog, type FlavorFormValue } from "./FlavorFormDialog";
import type { Flavor } from "@/types/catalog";

type Row = Flavor & { active: boolean; sort_order: number };

export function FlavorsPageContent({ initialFlavors }: { initialFlavors: Row[] }) {
  const t = useTranslations("Admin.table");
  const [flavors, setFlavors] = useState(initialFlavors);
  const [editing, setEditing] = useState<FlavorFormValue | null | undefined>(undefined);
  const supabase = createClient();

  async function refresh() {
    const { data } = await supabase.from("flavors").select("id, name, price_modifier, active, sort_order").order("sort_order");
    if (data) setFlavors(data as Row[]);
  }

  async function handleSave(value: FlavorFormValue) {
    const payload = { name: { en: value.name_en, ar: value.name_ar }, price_modifier: value.price_modifier };
    if (value.id) {
      await supabase.from("flavors").update(payload).eq("id", value.id);
    } else {
      await supabase.from("flavors").insert({ ...payload, sort_order: flavors.length });
    }
    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("flavors").delete().eq("id", id);
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("flavors").update({ active }).eq("id", id);
    setFlavors((prev) => prev.map((f) => (f.id === id ? { ...f, active } : f)));
  }

  const columns: AdminTableColumn<Row>[] = [
    { header: t("name"), render: (row) => `${row.name.en} / ${row.name.ar}` },
    { header: t("priceModifier"), render: (row) => `${row.price_modifier} ${t("egp")}` },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <RowActions
          itemLabel={row.name.en}
          onEdit={() => setEditing({ id: row.id, name_en: row.name.en, name_ar: row.name.ar, price_modifier: row.price_modifier })}
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("flavors")}</h1>
        <Button type="button" variant="brand-primary" onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      <AdminTable columns={columns} rows={flavors} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <FlavorFormDialog open={editing !== undefined} initialValue={editing ?? null} onSave={handleSave} onCancel={() => setEditing(undefined)} />
    </div>
  );
}
```

- [ ] **Step 4: Add translation keys**

In `messages/en.json`'s `Admin.table`, add: `"flavors": "Flavors"`, `"priceModifier": "Price Modifier"`, `"egp": "EGP"` (reuse `Common.egp` instead if it already exists — check `messages/en.json`'s `Common` block first and, if `egp` is already there, read it via a second `useTranslations("Common")` call in the component rather than duplicating the key).
In `messages/ar.json`'s `Admin.table`, add the matching `"flavors": "النكهات"`, `"priceModifier": "معدّل السعر"`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(admin)/admin/flavors/page.tsx" src/components/admin/flavors messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Flavors admin page

Same AdminTable/RowActions pattern as Colors, swapping the hex swatch
column for a price modifier column.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Toppers admin page (image upload + color variants)

**Files:**
- Create: `src/app/[locale]/(admin)/admin/toppers/page.tsx`
- Create: `src/components/admin/toppers/ToppersPageContent.tsx`
- Create: `src/components/admin/toppers/TopperFormDialog.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: `ImageUploader` (Task 4, `multiple={false}`), `AdminTable`/`RowActions`/`Switch` (Task 3). `topper_colors` join table (`topper_id`, `color_id`) for the inline swatch row.

- [ ] **Step 1: Write `page.tsx`**

Fetches toppers plus, for each, its `topper_colors` joined to `colors` for the inline swatch display, and the full `colors` list (for the form's color-variant picker):

```tsx
import { createClient } from "@/lib/supabase/server";
import { ToppersPageContent } from "@/components/admin/toppers/ToppersPageContent";

export default async function AdminToppersPage() {
  const supabase = await createClient();

  const [toppersRes, colorsRes] = await Promise.all([
    supabase
      .from("toppers")
      .select("id, name, price_modifier, has_color_variants, image_url, active, sort_order, topper_colors(color_id, colors(id, name, hex_code))")
      .order("sort_order"),
    supabase.from("colors").select("id, name, hex_code").eq("active", true).order("sort_order"),
  ]);

  if (toppersRes.error) throw toppersRes.error;
  if (colorsRes.error) throw colorsRes.error;

  return <ToppersPageContent initialToppers={toppersRes.data} allColors={colorsRes.data} />;
}
```

- [ ] **Step 2: Write `TopperFormDialog`**

```tsx
"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ImageUploader, type UploadedImage } from "@/components/admin/ImageUploader";
import type { Color } from "@/types/catalog";

export type TopperFormValue = {
  id?: string;
  name_en: string;
  name_ar: string;
  price_modifier: number;
  image_url: string | null;
  has_color_variants: boolean;
  color_ids: string[];
};

export function TopperFormDialog({
  open,
  initialValue,
  allColors,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: TopperFormValue | null;
  allColors: Color[];
  onSave: (value: TopperFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const tUpload = useTranslations("Admin.imageUploader");
  const [nameEn, setNameEn] = useState(initialValue?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialValue?.name_ar ?? "");
  const [priceModifier, setPriceModifier] = useState(String(initialValue?.price_modifier ?? 0));
  const [image, setImage] = useState<UploadedImage[]>(
    initialValue?.image_url ? [{ url: initialValue.image_url, sort_order: 0, is_primary: true }] : [],
  );
  const [hasColorVariants, setHasColorVariants] = useState(initialValue?.has_color_variants ?? false);
  const [colorIds, setColorIds] = useState<string[]>(initialValue?.color_ids ?? []);

  function toggleColor(id: string) {
    setColorIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameEn")}
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameAr")}
              <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("priceModifier")}
              <input type="number" step="0.01" value={priceModifier} onChange={(e) => setPriceModifier(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-text-primary">{tUpload("upload")}</span>
              <ImageUploader images={image} onChange={setImage} folder="toppers" multiple={false} />
            </div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
              <input type="checkbox" checked={hasColorVariants} onChange={(e) => setHasColorVariants(e.target.checked)} />
              {t("hasColorVariants")}
            </label>
            {hasColorVariants && (
              <div className="flex flex-wrap gap-2">
                {allColors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => toggleColor(color.id)}
                    className={
                      colorIds.includes(color.id)
                        ? "flex items-center gap-1.5 rounded-full border-2 border-brand-secondary px-2.5 py-1 text-xs"
                        : "flex items-center gap-1.5 rounded-full border-[1.5px] border-border-default px-2.5 py-1 text-xs"
                    }
                  >
                    <span className="size-3.5 rounded-full border border-border-default" style={{ backgroundColor: color.hex_code ?? undefined }} />
                    {color.name.en}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() =>
                onSave({
                  id: initialValue?.id,
                  name_en: nameEn,
                  name_ar: nameAr,
                  price_modifier: Number(priceModifier) || 0,
                  image_url: image[0]?.url ?? null,
                  has_color_variants: hasColorVariants,
                  color_ids: hasColorVariants ? colorIds : [],
                })
              }
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 3: Write `ToppersPageContent`**

Handles the topper upsert plus replacing its `topper_colors` rows (delete-then-insert is simplest and matches this table's small row counts):

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { TopperFormDialog, type TopperFormValue } from "./TopperFormDialog";
import type { Color, Topper } from "@/types/catalog";

type Row = Topper & {
  active: boolean;
  sort_order: number;
  topper_colors: { color_id: string; colors: Color }[];
};

export function ToppersPageContent({ initialToppers, allColors }: { initialToppers: Row[]; allColors: Color[] }) {
  const t = useTranslations("Admin.table");
  const [toppers, setToppers] = useState(initialToppers);
  const [editing, setEditing] = useState<TopperFormValue | null | undefined>(undefined);
  const supabase = createClient();

  async function refresh() {
    const { data } = await supabase
      .from("toppers")
      .select("id, name, price_modifier, has_color_variants, image_url, active, sort_order, topper_colors(color_id, colors(id, name, hex_code))")
      .order("sort_order");
    if (data) setToppers(data as unknown as Row[]);
  }

  async function handleSave(value: TopperFormValue) {
    const payload = {
      name: { en: value.name_en, ar: value.name_ar },
      price_modifier: value.price_modifier,
      image_url: value.image_url,
      has_color_variants: value.has_color_variants,
    };

    let topperId = value.id;
    if (topperId) {
      await supabase.from("toppers").update(payload).eq("id", topperId);
      await supabase.from("topper_colors").delete().eq("topper_id", topperId);
    } else {
      const { data, error } = await supabase.from("toppers").insert({ ...payload, sort_order: toppers.length }).select("id").single();
      if (error) throw error;
      topperId = data.id;
    }

    if (value.color_ids.length > 0) {
      await supabase.from("topper_colors").insert(value.color_ids.map((color_id) => ({ topper_id: topperId, color_id })));
    }

    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("toppers").delete().eq("id", id);
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("toppers").update({ active }).eq("id", id);
    setToppers((prev) => prev.map((tp) => (tp.id === id ? { ...tp, active } : tp)));
  }

  const columns: AdminTableColumn<Row>[] = [
    {
      header: t("name"),
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.image_url ? (
            <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-bg-surface-alt">
              <Image src={row.image_url} alt="" fill sizes="36px" className="object-cover" />
            </span>
          ) : (
            <span className="size-9 shrink-0 rounded-lg bg-bg-surface-alt" />
          )}
          {row.name.en} / {row.name.ar}
        </span>
      ),
    },
    { header: t("priceModifier"), render: (row) => `${row.price_modifier}` },
    {
      header: t("colorVariants"),
      render: (row) =>
        row.topper_colors.length > 0 ? (
          <span className="flex gap-1">
            {row.topper_colors.map((tc) => (
              <span key={tc.color_id} className="size-4 rounded-full border border-border-default" style={{ backgroundColor: tc.colors.hex_code ?? undefined }} />
            ))}
          </span>
        ) : (
          <span className="text-text-secondary">{t("noColorVariants")}</span>
        ),
    },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <RowActions
          itemLabel={row.name.en}
          onEdit={() =>
            setEditing({
              id: row.id,
              name_en: row.name.en,
              name_ar: row.name.ar,
              price_modifier: row.price_modifier,
              image_url: row.image_url,
              has_color_variants: row.has_color_variants,
              color_ids: row.topper_colors.map((tc) => tc.color_id),
            })
          }
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("toppers")}</h1>
        <Button type="button" variant="brand-primary" onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      <AdminTable columns={columns} rows={toppers} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <TopperFormDialog open={editing !== undefined} initialValue={editing ?? null} allColors={allColors} onSave={handleSave} onCancel={() => setEditing(undefined)} />
    </div>
  );
}
```

- [ ] **Step 4: Add translation keys**

In `messages/en.json`'s `Admin.table`, add: `"toppers": "Toppers"`, `"hasColorVariants": "Has color variants"`, `"colorVariants": "Color Variants"`, `"noColorVariants": "No color variants"`.
In `messages/ar.json`'s `Admin.table`: `"toppers": "الإضافات"`, `"hasColorVariants": "له تدرجات لونية"`, `"colorVariants": "التدرجات اللونية"`, `"noColorVariants": "لا توجد تدرجات لونية"`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(admin)/admin/toppers/page.tsx" src/components/admin/toppers messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Toppers admin page with image upload and color-variant swatches

Delete-then-insert on topper_colors for simplicity at this table's
small row count. Closes the topper-image gap noted during design.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Sizes admin page (category-scoped)

**Files:**
- Create: `src/app/[locale]/(admin)/admin/sizes/page.tsx`
- Create: `src/components/admin/sizes/SizesPageContent.tsx`
- Create: `src/components/admin/sizes/SizeFormDialog.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: `AdminTable`/`RowActions`/`Switch`/`Select` (Task 3). `Size` type: `{ id, category_id, min_qty, max_qty, unit, price_modifier, sort_order }`.

- [ ] **Step 1: Write `page.tsx`**

Fetches all top-level + subcategory categories (Sizes' category selector needs every category, unlike the storefront's top-level-only list) and the sizes for whichever category is selected via `?category=` query param, defaulting to the first category:

```tsx
import { createClient } from "@/lib/supabase/server";
import { SizesPageContent } from "@/components/admin/sizes/SizesPageContent";

export default async function AdminSizesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .order("sort_order");
  if (categoriesError) throw categoriesError;

  const selectedCategoryId = category ?? categories[0]?.id ?? null;

  const { data: sizes, error: sizesError } = selectedCategoryId
    ? await supabase
        .from("sizes")
        .select("id, category_id, min_qty, max_qty, unit, price_modifier, active, sort_order")
        .eq("category_id", selectedCategoryId)
        .order("sort_order")
    : { data: [], error: null };
  if (sizesError) throw sizesError;

  return (
    <SizesPageContent
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      initialSizes={sizes ?? []}
    />
  );
}
```

- [ ] **Step 2: Write `SizeFormDialog`**

```tsx
"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export type SizeFormValue = {
  id?: string;
  min_qty: number;
  max_qty: number;
  unit: "servings" | "quantity" | "cm";
  price_modifier: number;
};

export function SizeFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: SizeFormValue | null;
  onSave: (value: SizeFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const [minQty, setMinQty] = useState(String(initialValue?.min_qty ?? ""));
  const [maxQty, setMaxQty] = useState(String(initialValue?.max_qty ?? ""));
  const [unit, setUnit] = useState<SizeFormValue["unit"]>(initialValue?.unit ?? "servings");
  const [priceModifier, setPriceModifier] = useState(String(initialValue?.price_modifier ?? 0));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-[13px] font-medium text-text-primary">
                {t("minQty")}
                <input type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-[13px] font-medium text-text-primary">
                {t("maxQty")}
                <input type="number" value={maxQty} onChange={(e) => setMaxQty(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("unit")}
              <select value={unit} onChange={(e) => setUnit(e.target.value as SizeFormValue["unit"])} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm">
                <option value="servings">{t("unitServings")}</option>
                <option value="quantity">{t("unitQuantity")}</option>
                <option value="cm">{t("unitCm")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("priceModifier")}
              <input type="number" step="0.01" value={priceModifier} onChange={(e) => setPriceModifier(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() =>
                onSave({
                  id: initialValue?.id,
                  min_qty: Number(minQty) || 0,
                  max_qty: Number(maxQty) || 0,
                  unit,
                  price_modifier: Number(priceModifier) || 0,
                })
              }
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Note: this form uses a plain native `<select>` for the unit field, not the new shadcn `Select` from Task 3 — the Cake Form (Task 11) is where `Select` earns its place (Category/Subcategory, matching the design note that those specifically needed a real `<Select>`). Keeping this one native avoids importing `Select` here just to satisfy an unused-import lint rule; delete the unused `import { Select } from "@/components/ui/select";` line before committing since this component ends up not using it.

- [ ] **Step 3: Write `SizesPageContent`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { SizeFormDialog, type SizeFormValue } from "./SizeFormDialog";
import type { Category, Size } from "@/types/catalog";

type Row = Size & { active: boolean };

export function SizesPageContent({
  categories,
  selectedCategoryId,
  initialSizes,
}: {
  categories: Category[];
  selectedCategoryId: string | null;
  initialSizes: Row[];
}) {
  const t = useTranslations("Admin.table");
  const router = useRouter();
  const [sizes, setSizes] = useState(initialSizes);
  const [editing, setEditing] = useState<SizeFormValue | null | undefined>(undefined);
  const supabase = createClient();

  async function refresh() {
    if (!selectedCategoryId) return;
    const { data } = await supabase
      .from("sizes")
      .select("id, category_id, min_qty, max_qty, unit, price_modifier, active, sort_order")
      .eq("category_id", selectedCategoryId)
      .order("sort_order");
    if (data) setSizes(data as Row[]);
  }

  async function handleSave(value: SizeFormValue) {
    if (!selectedCategoryId) return;
    const payload = { category_id: selectedCategoryId, min_qty: value.min_qty, max_qty: value.max_qty, unit: value.unit, price_modifier: value.price_modifier };
    if (value.id) {
      await supabase.from("sizes").update(payload).eq("id", value.id);
    } else {
      await supabase.from("sizes").insert({ ...payload, sort_order: sizes.length });
    }
    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("sizes").delete().eq("id", id);
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("sizes").update({ active }).eq("id", id);
    setSizes((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)));
  }

  const columns: AdminTableColumn<Row>[] = [
    { header: t("minQty"), render: (row) => row.min_qty },
    { header: t("maxQty"), render: (row) => row.max_qty },
    { header: t("unit"), render: (row) => t(`unit${row.unit.charAt(0).toUpperCase()}${row.unit.slice(1)}` as "unitServings" | "unitQuantity" | "unitCm") },
    { header: t("priceModifier"), render: (row) => row.price_modifier },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <RowActions
          itemLabel={`${row.min_qty}–${row.max_qty}`}
          onEdit={() => setEditing({ id: row.id, min_qty: row.min_qty, max_qty: row.max_qty, unit: row.unit, price_modifier: row.price_modifier })}
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("sizes")}</h1>
        <Button type="button" variant="brand-primary" disabled={!selectedCategoryId} onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      <select
        value={selectedCategoryId ?? ""}
        onChange={(e) => router.push(`/admin/sizes?category=${e.target.value}`)}
        className="w-fit rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name.en}
          </option>
        ))}
      </select>
      <AdminTable columns={columns} rows={sizes} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <SizeFormDialog open={editing !== undefined} initialValue={editing ?? null} onSave={handleSave} onCancel={() => setEditing(undefined)} />
    </div>
  );
}
```

- [ ] **Step 4: Add translation keys**

In `messages/en.json`'s `Admin.table`, add: `"sizes": "Sizes"`, `"minQty": "Min"`, `"maxQty": "Max"`, `"unit": "Unit"`, `"unitServings": "Servings"`, `"unitQuantity": "Quantity"`, `"unitCm": "Centimeters"`.
In `messages/ar.json`'s `Admin.table`: `"sizes": "الأحجام"`, `"minQty": "الحد الأدنى"`, `"maxQty": "الحد الأقصى"`, `"unit": "الوحدة"`, `"unitServings": "أفراد"`, `"unitQuantity": "الكمية"`, `"unitCm": "سنتيمتر"`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. Remove the unused `Select` import flagged in Step 2 if it triggers a lint failure.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(admin)/admin/sizes/page.tsx" src/components/admin/sizes messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Sizes admin page, scoped per category via a top selector

Switching the category select re-fetches and re-filters the table,
per the design note that sizes are per-category, not one global list.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Categories admin page (drag-reorder, nested Candy Corner subcategories)

**Files:**
- Create: `src/app/[locale]/(admin)/admin/categories/page.tsx`
- Create: `src/components/admin/categories/CategoriesPageContent.tsx`
- Create: `src/components/admin/categories/CategoryRow.tsx`
- Create: `src/components/admin/categories/CategoryFormDialog.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Produces: drag-reorder persists `sort_order` via one batched `.update()` per moved row on drop (not a stored procedure — row counts here are tiny, a handful of top-level categories and 4 subcategories).
- Consumes: `ConfirmDialog`, `Button`.

- [ ] **Step 1: Write `page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { CategoriesPageContent } from "@/components/admin/categories/CategoriesPageContent";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, active, sort_order")
    .order("sort_order");

  if (error) throw error;

  return <CategoriesPageContent initialCategories={data} />;
}
```

- [ ] **Step 2: Write `CategoryFormDialog`**

Same shape as `ColorFormDialog` (Task 5) minus the hex field, plus a slug field (used for storefront routing — `/shop/[category]` reads `categories.slug`, per `src/lib/catalog/queries.ts`'s `getCategoryBySlug`):

```tsx
"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type CategoryFormValue = {
  id?: string;
  name_en: string;
  name_ar: string;
  slug: string;
};

export function CategoryFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: CategoryFormValue | null;
  onSave: (value: CategoryFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const [nameEn, setNameEn] = useState(initialValue?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialValue?.name_ar ?? "");
  const [slug, setSlug] = useState(initialValue?.slug ?? "");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameEn")}
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameAr")}
              <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("slug")}
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" placeholder="birthday" />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() => onSave({ id: initialValue?.id, name_en: nameEn, name_ar: nameAr, slug })}
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 3: Write `CategoryRow`**

A single draggable row, reused for both top-level categories and nested subcategories:

```tsx
"use client";

import { GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RowActions } from "@/components/admin/RowActions";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/catalog";

export function CategoryRow({
  category,
  active,
  indented,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  category: Category;
  active: boolean;
  indented: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onToggleActive: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-3",
        indented && "ms-8",
      )}
    >
      <GripVertical className="size-4 shrink-0 cursor-grab text-text-secondary" />
      <span className="flex-1 text-sm font-medium text-text-primary">
        {category.name.en} / {category.name.ar}
      </span>
      <Switch checked={active} onCheckedChange={onToggleActive} />
      <RowActions itemLabel={category.name.en} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
```

- [ ] **Step 4: Write `CategoriesPageContent`**

Groups categories into top-level (`parent_id === null`) and, for Candy Corner specifically, its 4 subcategories in an expand/collapse group. Drag reorder within each group persists `sort_order` on drop:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CategoryRow } from "./CategoryRow";
import { CategoryFormDialog, type CategoryFormValue } from "./CategoryFormDialog";
import type { Category } from "@/types/catalog";

type Row = Category & { active: boolean };

export function CategoriesPageContent({ initialCategories }: { initialCategories: Row[] }) {
  const t = useTranslations("Admin.table");
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<CategoryFormValue | null | undefined>(undefined);
  const [candyCornerExpanded, setCandyCornerExpanded] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const supabase = createClient();

  const topLevel = categories.filter((c) => c.parent_id === null);
  const candyCorner = topLevel.find((c) => c.slug === "candy-corner");
  const subcategories = candyCorner ? categories.filter((c) => c.parent_id === candyCorner.id) : [];

  async function refresh() {
    const { data } = await supabase.from("categories").select("id, parent_id, name, slug, active, sort_order").order("sort_order");
    if (data) setCategories(data as Row[]);
  }

  async function persistOrder(group: Row[]) {
    await Promise.all(group.map((row, index) => supabase.from("categories").update({ sort_order: index }).eq("id", row.id)));
    await refresh();
  }

  function handleDrop(group: Row[], targetId: string) {
    if (!dragId || dragId === targetId) return;
    const fromIndex = group.findIndex((c) => c.id === dragId);
    const toIndex = group.findIndex((c) => c.id === targetId);
    const reordered = [...group];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setDragId(null);
    persistOrder(reordered);
  }

  async function handleSave(value: CategoryFormValue, parentId: string | null) {
    const payload = { name: { en: value.name_en, ar: value.name_ar }, slug: value.slug, parent_id: parentId };
    if (value.id) {
      await supabase.from("categories").update(payload).eq("id", value.id);
    } else {
      const group = parentId ? subcategories : topLevel;
      await supabase.from("categories").insert({ ...payload, sort_order: group.length });
    }
    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("categories").delete().eq("id", id);
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("categories").update({ active }).eq("id", id);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("categories")}</h1>
        <Button type="button" variant="brand-primary" onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {topLevel.map((category) => (
          <div key={category.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {category.slug === "candy-corner" && (
                <button type="button" onClick={() => setCandyCornerExpanded((v) => !v)} className="text-text-secondary">
                  {candyCornerExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              )}
              <div className="flex-1">
                <CategoryRow
                  category={category}
                  active={category.active}
                  indented={false}
                  onDragStart={() => setDragId(category.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(topLevel, category.id)}
                  onToggleActive={(active) => toggleActive(category.id, active)}
                  onEdit={() =>
                    setEditing({ id: category.id, name_en: category.name.en, name_ar: category.name.ar, slug: category.slug })
                  }
                  onDelete={() => handleDelete(category.id)}
                />
              </div>
            </div>
            {category.slug === "candy-corner" && candyCornerExpanded && (
              <div className="flex flex-col gap-2">
                {subcategories.map((sub) => (
                  <CategoryRow
                    key={sub.id}
                    category={sub}
                    active={sub.active}
                    indented
                    onDragStart={() => setDragId(sub.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(subcategories, sub.id)}
                    onToggleActive={(active) => toggleActive(sub.id, active)}
                    onEdit={() => setEditing({ id: sub.id, name_en: sub.name.en, name_ar: sub.name.ar, slug: sub.slug })}
                    onDelete={() => handleDelete(sub.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <CategoryFormDialog
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={(value) => handleSave(value, editing?.id ? categories.find((c) => c.id === editing.id)?.parent_id ?? null : null)}
        onCancel={() => setEditing(undefined)}
      />
    </div>
  );
}
```

Note the `onSave` parent-id resolution is deliberately simple (new categories are always created as top-level from this dialog — adding a subcategory under Candy Corner specifically is a follow-up "+ Add Subcategory" affordance worth flagging to the human as a possible gap once this ships, not something to silently build differently than the design note described). Read the Figma "Admin - Categories" page screenshot at execution time (`get_screenshot`/`get_design_context` on that frame) to confirm whether a distinct "add subcategory" action exists there before finalizing this file — if it does, add a second small button next to the Candy Corner row that opens the same dialog with a `parentId` fixed to Candy Corner's id, and thread that through `handleSave`'s second argument instead of the `null` fallback shown above.

- [ ] **Step 5: Add translation keys**

In `messages/en.json`'s `Admin.table`, add: `"categories": "Categories"`, `"slug": "URL Slug"`.
In `messages/ar.json`'s `Admin.table`: `"categories": "الفئات"`, `"slug": "الرابط المختصر"`.

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(admin)/admin/categories/page.tsx" src/components/admin/categories messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Categories admin page with drag-reorder and nested Candy Corner subcategories

Native HTML5 drag events, no new dependency. Reorder persists
sort_order per-row on drop.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Cakes list page

**Files:**
- Create: `src/app/[locale]/(admin)/admin/cakes/page.tsx`
- Create: `src/components/admin/cakes/CakesListContent.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: `FilterChip` (`src/components/storefront/FilterChip.tsx`, reused as-is), `Pagination` (`src/components/storefront/Pagination.tsx`, reused as-is), `AdminTable`, `Switch`, `RowActions`.
- Produces: `?category=`, `?subcategory=`, `?sort=`, `?dir=`, `?page=` query-param driven filtering/sorting/pagination, all server-rendered (this page reads `searchParams`, unlike the client-heavy CRUD pages in Tasks 5–9 — it doesn't need instant-feedback editing, just browsing + links into the Cake Form).

- [ ] **Step 1: Write `page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { CakesListContent } from "@/components/admin/cakes/CakesListContent";

const PAGE_SIZE = 20;

export default async function AdminCakesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; subcategory?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const { category, subcategory, sort, dir, page } = await searchParams;
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .order("sort_order");
  if (categoriesError) throw categoriesError;

  const topLevel = categories.filter((c) => c.parent_id === null);
  const candyCorner = topLevel.find((c) => c.slug === "candy-corner");
  const subcategories = candyCorner ? categories.filter((c) => c.parent_id === candyCorner.id) : [];

  let categoryIds: string[] | null = null;
  if (subcategory) {
    categoryIds = [subcategory];
  } else if (category === "candy-corner") {
    categoryIds = subcategories.map((s) => s.id);
  } else if (category) {
    const match = topLevel.find((c) => c.slug === category);
    categoryIds = match ? [match.id] : [];
  }

  let query = supabase.from("cakes").select("id, category_id, name, description, base_price, primary_image_url, featured, active, sort_order");
  if (categoryIds) query = query.in("category_id", categoryIds);

  const sortColumn = sort === "price" ? "base_price" : sort === "name" ? "name" : "sort_order";
  query = query.order(sortColumn, { ascending: dir !== "desc" });

  const { data: cakes, error: cakesError } = await query;
  if (cakesError) throw cakesError;

  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(cakes.length / PAGE_SIZE));
  const pageCakes = cakes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <CakesListContent
      topLevel={topLevel}
      subcategories={subcategories}
      activeCategory={category ?? null}
      activeSubcategory={subcategory ?? null}
      cakes={pageCakes}
      categoriesById={Object.fromEntries(categories.map((c) => [c.id, c]))}
      sort={sort ?? "sort_order"}
      dir={(dir as "asc" | "desc") ?? "asc"}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  );
}
```

Note: sorting by `name` on a `jsonb` column (`.order("name", ...)`) sorts by Postgres's default `jsonb` comparison, not alphabetically by the `en` string inside it — acceptable for this admin list (small catalog, sort is a nice-to-have) but flag it in a one-line code comment so nobody mistakes it for a real alphabetical sort later:

```typescript
// Note: sorting by `name` sorts the raw jsonb value, not name.en
// alphabetically — fine for a small admin catalog, not a general solution.
```

Add that comment directly above the `sortColumn` line.

- [ ] **Step 2: Write `CakesListContent`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FilterChip } from "@/components/storefront/FilterChip";
import { Pagination } from "@/components/storefront/Pagination";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cake, Category } from "@/types/catalog";

type Row = Cake & { active: boolean };

export function CakesListContent({
  topLevel,
  subcategories,
  activeCategory,
  activeSubcategory,
  cakes,
  categoriesById,
  sort,
  dir,
  currentPage,
  totalPages,
}: {
  topLevel: Category[];
  subcategories: Category[];
  activeCategory: string | null;
  activeSubcategory: string | null;
  cakes: Row[];
  categoriesById: Record<string, Category>;
  sort: string;
  dir: "asc" | "desc";
  currentPage: number;
  totalPages: number;
}) {
  const t = useTranslations("Admin.table");
  const [rows, setRows] = useState(cakes);
  const supabase = createClient();

  async function handleDelete(id: string) {
    await supabase.from("cakes").delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("cakes").update({ active }).eq("id", id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
  }

  const basePath = "/admin/cakes";
  const query = new URLSearchParams();
  if (activeCategory) query.set("category", activeCategory);
  if (activeSubcategory) query.set("subcategory", activeSubcategory);

  function sortHref(key: "name" | "price") {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    const q = new URLSearchParams(query);
    q.set("sort", key);
    q.set("dir", nextDir);
    return `${basePath}?${q.toString()}`;
  }

  const columns: AdminTableColumn<Row>[] = [
    {
      header: t("cake"),
      render: (row) => (
        <Link href={`/admin/cakes/${row.id}`} className="flex items-center gap-2">
          {row.primary_image_url ? (
            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-bg-surface-alt">
              <Image src={row.primary_image_url} alt="" fill sizes="40px" className="object-cover" />
            </span>
          ) : (
            <span className="size-10 shrink-0 rounded-lg bg-bg-surface-alt" />
          )}
          <span className="text-sm font-medium text-text-primary">{row.name.en}</span>
        </Link>
      ),
    },
    { header: t("category"), render: (row) => categoriesById[row.category_id]?.name.en ?? "" },
    { header: t("priceModifier"), render: (row) => row.base_price },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link href={`/admin/cakes/${row.id}`}>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t("edit")}>
              ✏️
            </Button>
          </Link>
          <RowActions itemLabel={row.name.en} onEdit={() => {}} onDelete={() => handleDelete(row.id)} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("cakes")}</h1>
        <Link href="/admin/cakes/new">
          <Button type="button" variant="brand-primary">
            {t("add")}
          </Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip href={basePath} label={t("all")} active={!activeCategory} />
        {topLevel.map((category) => (
          <FilterChip key={category.id} href={`${basePath}?category=${category.slug}`} label={category.name.en} active={activeCategory === category.slug} />
        ))}
      </div>
      {activeCategory === "candy-corner" && (
        <div className="flex flex-wrap gap-2 ps-4">
          {subcategories.map((sub) => (
            <FilterChip key={sub.id} href={`${basePath}?category=candy-corner&subcategory=${sub.id}`} label={sub.name.en} active={activeSubcategory === sub.id} />
          ))}
        </div>
      )}
      <AdminTable columns={columns} rows={rows} getRowId={(row) => row.id} emptyMessage={t("noResults")} sortKey={sort} sortDir={dir} sortBasePath={sortHref("name") /* placeholder, replaced below */} />
      <Pagination basePath={basePath} currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}
```

This `RowActions onEdit={() => {}}` and the placeholder-labeled `sortBasePath` are both real problems to fix, not accidental placeholders left in — resolve both before moving on:

1. **Edit action**: `RowActions` was designed (Task 3) for a single edit callback that opens an in-page dialog, but Cakes' "edit" is a navigation to `/admin/cakes/[id]`, not a dialog. Don't reuse `RowActions` here as-is. Replace the whole last column's `render` with just the delete button pulled out of `RowActions`'s internals, or — simpler and consistent with not duplicating `ConfirmDialog` wiring — extend `RowActions`'s props (`src/components/admin/RowActions.tsx`) to accept an optional `editHref?: string` that renders the edit button as a `Link` instead of a click-handler button when present, falling back to the current `onClick={onEdit}` behavior otherwise. Update the four other pages that already call `<RowActions onEdit={...} .../>` (Colors, Flavors, Toppers, Sizes, Categories — Tasks 5–9) — no changes needed there since `editHref` is optional and they don't pass it.
2. **`AdminTable`'s column-level sort**: the design (Task 3, Step 4) expects each sortable column to carry its own `sortKey` and the table to build the link per-column — the `sortBasePath="/admin/cakes?..."` prop shape doesn't fit that; drop the single `sortBasePath`/`sortKey`/`sortDir` props from `AdminTable` entirely for this page's usage. Add `sortKey: "name"` and `sortKey: "price"` to the `cake`/`priceModifier` columns above, then have `AdminTable` (revisit `src/components/admin/AdminTable.tsx` from Task 3) accept a single `buildSortHref: (key: string, nextDir: "asc" | "desc") => string` callback instead of `sortBasePath`, and pass `buildSortHref={(key, d) => { const q = new URLSearchParams(query); q.set("sort", key); q.set("dir", d); return \`${basePath}?${q.toString()}\`; }}` from here. Go back and update `AdminTable`'s Step 4 implementation (Task 3) accordingly — this task surfaces a design gap in that earlier component, and the fix belongs in that file, not duplicated logic here. Every other page that uses `AdminTable` (Colors/Flavors/Toppers/Sizes) doesn't pass `buildSortHref`, so their columns simply won't render as sortable, matching their design (only Cakes needed sortable columns per the spec).

- [ ] **Step 3: Apply the `AdminTable` and `RowActions` fixes from Step 2**

Edit `src/components/admin/AdminTable.tsx`: replace the `sortKey`/`sortDir`/`sortBasePath` props with `buildSortHref?: (key: string, nextDir: "asc" | "desc") => string`, and update the header-rendering logic to call it:

```tsx
export function AdminTable<T>({
  columns,
  rows,
  getRowId,
  emptyMessage,
  currentSortKey,
  currentSortDir,
  buildSortHref,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage: string;
  currentSortKey?: string;
  currentSortDir?: "asc" | "desc";
  buildSortHref?: (key: string, nextDir: "asc" | "desc") => string;
}) {
  if (rows.length === 0) {
    return <p className="py-16 text-center text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-surface-alt text-start">
            {columns.map((col) => {
              const isSorted = buildSortHref && col.sortKey && currentSortKey === col.sortKey;
              const nextDir = isSorted && currentSortDir === "asc" ? "desc" : "asc";
              const header = (
                <span className="flex items-center gap-1">
                  {col.header}
                  {isSorted && (currentSortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                </span>
              );
              return (
                <th key={col.header} className="p-3 text-start font-semibold text-text-primary">
                  {buildSortHref && col.sortKey ? <Link href={buildSortHref(col.sortKey, nextDir)}>{header}</Link> : header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)} className="border-b border-border-default last:border-0 hover:bg-bg-surface-alt">
              {columns.map((col) => (
                <td key={col.header} className="p-3 align-middle text-text-primary">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Edit `src/components/admin/RowActions.tsx`: add the optional `editHref` prop.

```tsx
"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function RowActions({
  onEdit,
  onDelete,
  itemLabel,
  editHref,
}: {
  onEdit?: () => void;
  onDelete: () => void;
  itemLabel: string;
  editHref?: string;
}) {
  const t = useTranslations("Admin.table");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-1">
      {editHref ? (
        <Link href={editHref}>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("edit")}>
            <Pencil className="size-4" />
          </Button>
        </Link>
      ) : (
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("edit")} onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t("delete")} onClick={() => setConfirming(true)}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t("deleteTitle")}
        message={t("deleteMessage", { item: itemLabel })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
```

Now rewrite `CakesListContent`'s last column and `AdminTable` usage from Step 2 to match:

```tsx
    {
      header: "",
      render: (row) => <RowActions itemLabel={row.name.en} editHref={`/admin/cakes/${row.id}`} onDelete={() => handleDelete(row.id)} />,
    },
```

And the `<AdminTable ... />` call:

```tsx
      <AdminTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage={t("noResults")}
        currentSortKey={sort}
        currentSortDir={dir}
        buildSortHref={(key, nextDir) => {
          const q = new URLSearchParams(query);
          q.set("sort", key);
          q.set("dir", nextDir);
          return `${basePath}?${q.toString()}`;
        }}
      />
```

Add `sortKey: "name"` to the `cake` column and `sortKey: "price"` to the `priceModifier` column in the `columns` array. Remove the now-redundant standalone `Link` "✏️" button from the last column (replaced by `RowActions`'s `editHref`).

- [ ] **Step 4: Add translation keys**

In `messages/en.json`'s `Admin.table`, add: `"cakes": "Cakes"`, `"cake": "Cake"`, `"category": "Category"`, `"all": "All"`.
In `messages/ar.json`'s `Admin.table`: `"cakes": "الكيكات"`, `"cake": "الكيكة"`, `"category": "الفئة"`, `"all": "الكل"`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors, and no unused-import warnings from the removed pieces.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(admin)/admin/cakes/page.tsx" src/components/admin/cakes src/components/admin/AdminTable.tsx src/components/admin/RowActions.tsx messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Cakes admin list page (filters, sortable columns, pagination)

Extends AdminTable with a buildSortHref callback and RowActions with
an editHref option, since Cakes' edit action navigates to the Cake
Form rather than opening an in-page dialog like every other catalog
table.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Cake Form page (create/edit, multi-image, Category/Subcategory Select)

**Files:**
- Create: `src/app/[locale]/(admin)/admin/cakes/[id]/page.tsx`
- Create: `src/components/admin/cakes/CakeForm.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: `Select` (Task 3), `ImageUploader` with `multiple={true}` (Task 4).
- Produces: handles both `/admin/cakes/new` (id === `"new"`, no fetch) and `/admin/cakes/[uuid]` (fetch existing cake + its `cake_images`).

- [ ] **Step 1: Read the shadcn `Select` API before using it**

Open `src/components/ui/select.tsx` (created in Task 3) and note its exact exported component names and prop shapes (shadcn's `select.tsx` typically exports `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` — but confirm against what actually got generated for the `base-nova` style before writing Step 3 below, since exact sub-component names can vary by shadcn style/version).

- [ ] **Step 2: Write `page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { CakeForm } from "@/components/admin/cakes/CakeForm";

export default async function AdminCakeFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .order("sort_order");
  if (categoriesError) throw categoriesError;

  if (id === "new") {
    return <CakeForm categories={categories} cake={null} images={[]} />;
  }

  const [{ data: cake, error: cakeError }, { data: images, error: imagesError }] = await Promise.all([
    supabase.from("cakes").select("id, category_id, name, description, base_price, featured, active").eq("id", id).maybeSingle(),
    supabase.from("cake_images").select("id, cake_id, url, sort_order, is_primary").eq("cake_id", id).order("sort_order"),
  ]);
  if (cakeError) throw cakeError;
  if (imagesError) throw imagesError;

  return <CakeForm categories={categories} cake={cake} images={images ?? []} />;
}
```

- [ ] **Step 3: Write `CakeForm`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImageUploader, type UploadedImage } from "@/components/admin/ImageUploader";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cake, CakeImage, Category } from "@/types/catalog";

export function CakeForm({
  categories,
  cake,
  images,
}: {
  categories: Category[];
  cake: (Cake & { active: boolean }) | null;
  images: CakeImage[];
}) {
  const t = useTranslations("Admin.table");
  const router = useRouter();
  const supabase = createClient();

  const topLevel = categories.filter((c) => c.parent_id === null);
  const candyCorner = topLevel.find((c) => c.slug === "candy-corner");
  const subcategories = candyCorner ? categories.filter((c) => c.parent_id === candyCorner.id) : [];
  const initialCategory = cake ? categories.find((c) => c.id === cake.category_id) : null;
  const initialTopLevelId = initialCategory?.parent_id ?? initialCategory?.id ?? topLevel[0]?.id ?? "";
  const initialSubcategoryId = initialCategory?.parent_id ? initialCategory.id : "";

  const [nameEn, setNameEn] = useState(cake?.name.en ?? "");
  const [nameAr, setNameAr] = useState(cake?.name.ar ?? "");
  const [descriptionEn, setDescriptionEn] = useState(cake?.description?.en ?? "");
  const [descriptionAr, setDescriptionAr] = useState(cake?.description?.ar ?? "");
  const [basePrice, setBasePrice] = useState(String(cake?.base_price ?? 0));
  const [topLevelId, setTopLevelId] = useState(initialTopLevelId);
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategoryId);
  const [featured, setFeatured] = useState(cake?.featured ?? false);
  const [active, setActive] = useState(cake?.active ?? true);
  const [cakeImages, setCakeImages] = useState<UploadedImage[]>(
    images.map((img) => ({ url: img.url, sort_order: img.sort_order, is_primary: img.is_primary })),
  );
  const [saving, setSaving] = useState(false);

  const isCandyCorner = topLevel.find((c) => c.id === topLevelId)?.slug === "candy-corner";
  const finalCategoryId = isCandyCorner && subcategoryId ? subcategoryId : topLevelId;

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload = {
        category_id: finalCategoryId,
        name: { en: nameEn, ar: nameAr },
        description: descriptionEn || descriptionAr ? { en: descriptionEn, ar: descriptionAr } : null,
        base_price: Number(basePrice) || 0,
        featured,
        active,
      };

      let cakeId = cake?.id;
      if (cakeId) {
        await supabase.from("cakes").update(payload).eq("id", cakeId);
        await supabase.from("cake_images").delete().eq("cake_id", cakeId);
      } else {
        const { data, error } = await supabase.from("cakes").insert(payload).select("id").single();
        if (error) throw error;
        cakeId = data.id;
      }

      if (cakeImages.length > 0) {
        await supabase.from("cake_images").insert(
          cakeImages.map((img) => ({ cake_id: cakeId, url: img.url, sort_order: img.sort_order, is_primary: img.is_primary })),
        );
      }

      router.push("/admin/cakes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="font-heading text-2xl font-bold text-text-primary">{cake ? t("edit") : t("add")}</h1>

      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("nameEn")}
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("nameAr")}
        <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("descriptionEn")}
        <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("descriptionAr")}
        <textarea dir="rtl" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={3} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("category")}
        <select
          value={topLevelId}
          onChange={(e) => {
            setTopLevelId(e.target.value);
            setSubcategoryId("");
          }}
          className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
        >
          {topLevel.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name.en}
            </option>
          ))}
        </select>
      </label>

      {isCandyCorner && (
        <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
          {t("subcategory")}
          <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm">
            <option value="">{t("selectSubcategory")}</option>
            {subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name.en}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("priceModifier")}
        <input type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-text-primary">{t("images")}</span>
        <ImageUploader images={cakeImages} onChange={setCakeImages} folder="cakes" multiple />
      </div>

      <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
        <Switch checked={featured} onCheckedChange={setFeatured} />
        {t("featured")}
      </label>
      <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
        <Switch checked={active} onCheckedChange={setActive} />
        {t("active")}
      </label>

      <div className="mt-2 flex gap-2">
        <Button type="button" variant="brand-primary" disabled={saving} onClick={handleSubmit}>
          {t("save")}
        </Button>
        <Button type="button" variant="brand-ghost" onClick={() => router.push("/admin/cakes")}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
```

This uses plain native `<select>` elements for Category/Subcategory, not the shadcn `Select` from Step 1/Task 3 — the design explicitly calls for a real `<Select>` component here (spec section 5, "Category and Candy Corner Subcategory are proper SELECT/dropdown fields"). Rewrite the two `<select>` blocks above using whatever `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` API Step 1 found in `src/components/ui/select.tsx` — the native `<select>` shown here is a functional placeholder for this plan's code listing, not what should ship. A typical shadcn `Select` swap looks like:

```tsx
<Select value={topLevelId} onValueChange={(value) => { setTopLevelId(value); setSubcategoryId(""); }}>
  <SelectTrigger className="w-full">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {topLevel.map((category) => (
      <SelectItem key={category.id} value={category.id}>
        {category.name.en}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Confirm the exact prop/component names against the real generated file before committing, and apply the same swap to the Subcategory field.

- [ ] **Step 4: Add translation keys**

In `messages/en.json`'s `Admin.table`, add: `"descriptionEn": "Description (English)"`, `"descriptionAr": "Description (Arabic)"`, `"subcategory": "Subcategory"`, `"selectSubcategory": "Select a subcategory"`, `"images": "Images"`, `"featured": "Featured"`, `"cancel"` (already added in Task 3, skip if present).
In `messages/ar.json`'s `Admin.table`: `"descriptionEn": "الوصف (إنجليزي)"`, `"descriptionAr": "الوصف (عربي)"`, `"subcategory": "الفئة الفرعية"`, `"selectSubcategory": "اختر فئة فرعية"`, `"images": "الصور"`, `"featured": "مميز"`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(admin)/admin/cakes/[id]/page.tsx" src/components/admin/cakes/CakeForm.tsx messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Cake Form (create/edit) with multi-image upload and category Select

Category/Subcategory use the real shadcn Select component per the
design note. Subcategory only applies/shows for Candy Corner.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Docs — update TASKS.md and ARCHITECTURE.md, final consolidated commit message

**Files:**
- Modify: `TASKS.md`
- Modify: `ARCHITECTURE.md`

**Interfaces:** None (docs only).

- [ ] **Step 1: Check off Phase 5 in `TASKS.md`**

Replace the Phase 5 section (currently unchecked) with:

```markdown
## Phase 5 — Admin: catalog

- [x] Cakes CRUD (images via Cloudinary, bilingual fields)
- [x] Categories CRUD + reorder (incl. Candy Corner subcategories — now 4: cupcakes, pops, popsicles, dessert cups)
- [x] Sizes/Flavors/Colors/Toppers management (incl. temporary disable)
- [ ] Migrate existing `public/images/*` photos (categories, placeholder cakes) to Cloudinary and re-point the DB rows — deferred follow-up, see ARCHITECTURE.md's Phase 5 section
```

- [ ] **Step 2: Add a Phase 5 section to `ARCHITECTURE.md`**

Insert a new section after the "Business analytics" / before "Manual/offline order entry" section (or at the end, whichever reads better in context — check the current file structure first), summarizing what actually got built, matching the style of the existing "Phase 4 — Checkout & accounts" section:

```markdown
## Phase 5 — Admin: catalog

Admin dashboard (`/admin`, gated to `role === 'admin'` server-side via `src/lib/admin/requireAdmin.ts`) with a collapsible sidebar (`AdminSidebarNav`) grouping Catalog (active: Cakes/Categories/Sizes/Flavors/Colors/Toppers) and Orders/Money/Team (disabled placeholders for future phases). First admin account must be granted by hand (`update profiles set role = 'admin' where id = '...'`) until Phase 8 builds account management.

- **`cake_images.is_primary`** + `fn_sync_cake_primary_image()` trigger (`20260815160000_phase5_admin_catalog.sql`): admin marks one uploaded image per cake as primary; the trigger keeps `cakes.primary_image_url` in sync so every existing storefront query (`ProductCard`, Home, Cart, `CakeCustomizer`, `OrderDetailModal`) needed zero changes.
- **`toppers.image_url`** (same migration): closes a pre-existing gap where `TopperCard` had an `imageSrc` prop nothing ever populated — toppers now show a real photo in the storefront customizer once an admin uploads one.
- **Cloudinary**: signed upload only (`src/app/api/admin/cloudinary-signature/route.ts`, session + admin-role checked, Node's built-in `crypto` for the signature — no `cloudinary` npm package). Browser uploads directly to Cloudinary with that signature via `src/lib/admin/cloudinaryUpload.ts`. Used by the Cake Form (multi-image, primary marking) and the Toppers page (single image).
- **`AdminTable`** (`src/components/admin/AdminTable.tsx`) is the one shared table implementation driving Sizes/Flavors/Colors/Toppers; Cakes and Categories have bespoke layouts (filter chips + sortable columns + pagination; drag-reorder + nested subcategories) since they diverge enough to not fit the shared shape.
- **Category reorder**: native HTML5 drag events, not a drag-and-drop library — row counts here are small (a handful of top-level categories, 4 Candy Corner subcategories).
- **Deferred**: migrating existing `public/images/*` local photos to Cloudinary is a separate follow-up (see TASKS.md) — easier to do through the now-working upload UI than by hand.
```

- [ ] **Step 3: Type-check and lint one more time across the whole phase**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors anywhere in the tree.

- [ ] **Step 4: Stage and propose the final consolidated commit**

```bash
git add TASKS.md ARCHITECTURE.md
```

Present this consolidated message to the human as the suggested commit covering docs (the code itself was already committed task-by-task in Tasks 1–11):

```
Update TASKS.md and ARCHITECTURE.md for Phase 5 — Admin catalog

Documents the admin shell, cake_images primary-image sync, toppers
image support, signed Cloudinary upload wiring, and the deferred
local-photo-migration follow-up.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

---

## Post-plan reminders for whoever executes this

1. **Migration must be pushed by the human** (Task 1) before Tasks 5–11's Supabase calls will resolve correctly against real data — `supabase db push` or the dashboard SQL editor, no CLI/MCP available this session.
2. **Cloudinary env vars must be set by the human** (Task 4) before image upload works — `.env.local` + Vercel dashboard, never pasted into chat.
3. **First admin account must be granted by hand** (Task 2) — no admin-invite UI exists until Phase 8.
4. Two components (`AdminTable`, `RowActions`) get extended mid-plan (Task 10) beyond their Task 3 shape — if executing out of order or via parallel subagents, Task 10 must land after Tasks 5–9 (which depend on the Task 3 shape) but its `AdminTable`/`RowActions` edits are additive (new optional props), so it won't break them.
