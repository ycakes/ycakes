# Phase 5 — Admin Catalog: Design

Status: approved, pending implementation plan.
Source: Figma design session ("YCakes — Design System", key `UR2u2vVxduNHFheGewn9CH`) + this session's brainstorming. See TASKS.md Phase 5 and ARCHITECTURE.md for surrounding context.

## Scope

Admin dashboard catalog management: Cakes CRUD (multi-image via Cloudinary), Categories CRUD + reorder (incl. Candy Corner's 4 subcategories), Sizes/Flavors/Colors/Toppers management with temporary disable. Admin-only this phase (accountant gets DB-level read access for analytics later, not this UI). Orders/Money/Team nav sections render as disabled placeholders — not built.

Out of scope (explicitly deferred): migrating existing local `public/images/*` photos to Cloudinary (separate follow-up task, added to TASKS.md), Orders/Money/Team admin sections (Phase 6/7), multi-admin account management UI (Phase 8 — the first admin account is granted by hand via direct `profiles.role` update).

## 1. Schema change

One migration, two changes:

**`toppers.image_url`**: toppers need a real photo (e.g. a graduation-hat topper shown as an actual image when picking toppers on a Custom Cake). `src/components/storefront/TopperCard.tsx` already accepts an `imageSrc` prop but nothing has ever populated it — `toppers` has no image column today, so every topper currently renders an empty tinted box in the storefront customizer. Fixed by adding:

```sql
alter table public.toppers add column image_url text;
```

Single image per topper (not a multi-image join table like cakes — toppers are one simple pick-one visual, no gallery need). Nullable, since existing seeded toppers have none yet until the admin uploads one via the new Toppers admin page. `src/lib/catalog/queries.ts`'s `getToppers()` and `src/types/catalog.ts`'s `Topper` type both need `image_url` added so `CakeCustomizer` can finally pass a real `imageSrc` into `TopperCard` instead of leaving it undefined.

**`cake_images` primary-image flag** + sync trigger:

```sql
alter table public.cake_images add column is_primary boolean not null default false;

create or replace function public.fn_sync_cake_primary_image()
returns trigger as $$
begin
  if (tg_op in ('INSERT','UPDATE')) and new.is_primary then
    update public.cake_images
      set is_primary = false
      where cake_id = new.cake_id and id <> new.id and is_primary;
    update public.cakes set primary_image_url = new.url where id = new.cake_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_sync_cake_primary_image
after insert or update of is_primary, url on public.cake_images
for each row execute function public.fn_sync_cake_primary_image();
```

- No RLS changes needed — `cake_images` already has public read, `admin_all` CRUD, and accountant read from earlier migrations.
- `cakes.primary_image_url` stays as the column every existing storefront query already reads (`ProductCard`, Home, Cart, `CakeCustomizer`, `OrderDetailModal`) — zero changes needed there. It becomes fully derived/denormalized from `cake_images.is_primary` going forward; admin CRUD is the only writer of `cake_images` from here on.
- Deleting the primary `cake_images` row: leaves `cakes.primary_image_url` pointing at a dead URL until the admin picks a new primary. Acceptable — the Cake Form always shows the current primary and lets the admin reassign it; not auto-reassigning on delete avoids surprising behavior (e.g. silently promoting an arbitrary remaining image).
- `src/types/catalog.ts`: add `CakeImage = { id: string; cake_id: string; url: string; sort_order: number; is_primary: boolean }`.

## 2. Admin shell

- `src/app/[locale]/(admin)/admin/layout.tsx` (Server Component): fetches session + `profiles.role` server-side. No session → redirect `/login`. `role !== 'admin'` → redirect `/`. Renders `AdminSidebarNav` + content area.
- `AdminSidebarNav` (`src/components/admin/AdminSidebarNav.tsx`): collapsible (expanded/collapsed state, client component wrapping the layout), grouped:
  - **Catalog** (active): Cakes, Categories, Sizes, Flavors, Colors, Toppers
  - **Orders / Money / Team**: rendered, `disabled` styling, no `href` — future-phase placeholders per the Figma note
- `AdminNavItem` (`src/components/admin/AdminNavItem.tsx`): default/hover/active/disabled states, lucide icon + label, collapses to icon-only when sidebar collapsed.
- Locale/RTL: admin lives under `[locale]`, so `dir` is already handled by the root layout — sidebar sits on the RTL-appropriate side automatically; verify `left`/`right` spacing uses logical properties (`ps-`/`pe-`/`start-`/`end-`), not hardcoded `left`/`right`.

## 3. Shared components (new)

- `Select` — `npx shadcn add select`, real Radix-backed component (not a literal Figma-frame copy). Used for Category/Subcategory in the Cake Form and the Category selector at the top of Sizes.
- `Switch` — `npx shadcn add switch`. Active/inactive toggle, used in every catalog table row.
- `RowActions` (`src/components/admin/RowActions.tsx`): Edit (pencil) / Delete (trash) icon buttons, delete confirms via the existing `ConfirmDialog`.
- `AdminTable` (`src/components/admin/AdminTable.tsx`): generic table shell (header row w/ optional sort caret, row hover state) parameterized by column config. Drives Sizes, Flavors, Colors, Toppers list pages — each passes its own columns (Colors: hex swatch; Toppers: inline `topper_colors` swatches or "No color variants" text; Sizes/Flavors: no thumbnail column). Cakes and Categories get bespoke layouts (category filter chips + subcategory sub-row; drag-reorder + nested subcategory group) since they diverge enough that forcing them into `AdminTable` would fight the component more than it'd save.
- Pagination: reuse the existing `src/components/storefront/Pagination.tsx` (query-param based) for the Cakes list rather than rebuilding it.

## 4. Cloudinary wiring

- New env vars, added by you directly to `.env.local` (not pasted into chat): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Also add to `.env.example` (empty) and the Vercel project dashboard.
- `src/app/api/admin/cloudinary-signature/route.ts` (Route Handler, session + `role === 'admin'` checked server-side): computes a Cloudinary upload signature by hand (SHA-1 of sorted params + `CLOUDINARY_API_SECRET`, per Cloudinary's documented signing scheme) — no `cloudinary` npm package, avoids a new dependency for one small piece of crypto Node's built-in `crypto` module already covers.
- Cake Form's image uploader: browser requests a signature from that route, then `POST`s the file directly to `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` with the signature — secret never reaches the client. On success, inserts a `cake_images` row (`url` = Cloudinary's returned `secure_url`).
- Multi-image UI: thumbnail grid, drag-to-reorder (`sort_order`), a "set as primary" action per thumbnail, remove (deletes the `cake_images` row — does not delete from Cloudinary this phase, matching how nothing else in the app manages Cloudinary-side deletion yet; acceptable since storage cost is negligible at this scale).

## 5. Pages

- **Admin - Cakes** (`/admin/cakes`): category filter chips (top-level + "Candy Corner" triggers a second subcategory chip row), sortable Cake/Price columns, table (thumbnail from `primary_image_url`, bilingual name, category, price, active switch, row actions), pagination.
- **Admin - Cake Form** (`/admin/cakes/new`, `/admin/cakes/[id]`): bilingual name/description, Category `Select` + conditional Subcategory `Select` (Candy Corner only), base price, multi-image uploader w/ primary marking, active toggle, featured toggle.
- **Admin - Categories** (`/admin/categories`): drag-to-reorder list, Candy Corner's 4 subcategories nested under an expand/collapse chevron with independent reorder, CRUD.
- **Admin - Sizes** (`/admin/sizes`): Category `Select` at top re-filters the table; `AdminTable` beneath (min/max qty, unit, price modifier, active, actions).
- **Admin - Flavors / Colors / Toppers**: each an `AdminTable` instance with its type-specific column (Flavors: price modifier; Colors: hex swatch + price N/A; Toppers: thumbnail from `image_url` + price modifier + color-variant swatches). Toppers' row/form image upload reuses the same signed-Cloudinary-upload route as the Cake Form, single-file rather than multi.

All forms: bilingual (en/ar) fields side by side or tabbed — follow the existing `InputField`/`Section` convention from `CakeCustomizer`/`Register` rather than inventing a new form pattern. All EN/AR strings via next-intl messages, no hardcoded English.

## 6. Verification

Per CLAUDE.md, no dev server / browser self-test. Verification is: `npm run lint`, `tsc --noEmit`, migration applied via `supabase db push` + `get_advisors` check (per ARCHITECTURE.md's Development environment note), and a manual read-through of each new RLS-touching path against the Roles table. You test the UI manually.

## Open item carried forward (not blocking)

Migrating existing `public/images/*` photos (categories, placeholder cakes, toppers-if-any) to Cloudinary — separate task, added to TASKS.md under a new Phase 5 follow-up line, done after this phase's CRUD ships since it's much easier to do through working admin upload UI than by hand.
