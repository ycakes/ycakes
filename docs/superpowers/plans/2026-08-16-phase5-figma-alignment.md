# Phase 5 Figma Alignment + Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the already-shipped Phase 5 admin catalog UI in line with the real Figma designs (which were never actually consulted during the original build), add a discovered "Available as Fake Cake" per-cake toggle (new schema field), add an EN/AR language toggle to the admin sidebar, and close out the three remaining Phase 5 follow-up items.

**Architecture:** Design facts (exact spacing, colors, copy, structure) were pulled directly from Figma via `get_design_context`/`get_metadata` this session — see the "Design Reference" section below, which is the source of truth for every task. All design tokens used (`--color-brand-primary: #501907`, `--color-bg-page: #f6e3d2`, `--color-bg-surface: white`, `--color-border-default: #ddd2c7`, `--color-text-primary: #2b1e19`, `--color-text-secondary: #6b5c54`, `--color-state-success: #3e7d4c`, `--color-state-error: #c23b2e`, radius-full `999px`, table radius `24px`) already exist in `src/app/globals.css` from Phase 3/4 — this plan only changes which classes reference them, not the token values themselves.

**Tech Stack:** Same as the rest of Phase 5 — Next.js App Router, Supabase, `@base-ui/react`-backed shadcn components, next-intl, Tailwind.

**Spec:** No new spec doc — this is a design-alignment pass over the already-approved `docs/superpowers/specs/2026-08-15-phase5-admin-catalog-design.md`, with one schema addition (`cakes.allow_fake`) confirmed with the human this session.

## Design Reference (pulled from Figma this session, file key `UR2u2vVxduNHFheGewn9CH`)

### Shared tokens (confirmed identical across every page pulled)
- Page background: `bg-[var(--color-bg-page)]` (`#f6e3d2`)
- Sidebar/card surface: `bg-[var(--color-bg-surface)]` (white), border `border-[var(--color-border-default)]` (`#ddd2c7`)
- Text: primary `#2b1e19`, secondary `#6b5c54`
- Brand: primary `#501907` (pill buttons, active nav item, primary CTA), secondary/accent `#fc5c00` (used for "Cancel"-style secondary buttons only)
- Switch on-state: `#3e7d4c` (green), knob white circle
- Row Actions delete icon: `#c23b2e` (red), edit icon: secondary text color
- Fonts: Baloo 2 (headings — page titles, card titles), Cairo (body/UI, incl. Arabic)
- Table: `rounded-[24px]` wrapper, `border` default color, header row `h-[44px]` bg `bg-[var(--color-bg-subtle)]` (`#fdfaf5`), data rows `h-[60-64px]` alternating white/`bg-subtle` stripe, row padding `px-[24px]`, column gap `16px`
- Top bar: `h-[80px]`, `px-[32px]`, white bg, border-b, page title (Baloo 2 Bold `28px`) left, primary action button right
- Content area padding: `px-[32px] py-[24px]`
- Card (form sections): `rounded-[24px]`, `border`, `p-[20-24px]`

### Admin Sidebar Nav (`AdminSidebarNav`) — real structure, differs from what was built
- Fixed `w-[240px]` (not 256px/76px as built), `border-r`
- Header (`h-[64px]`, border-b): "yCakes Admin" (Baloo 2 SemiBold 18px) + collapse-toggle icon button, `pl-[20px] pr-[16px]`
- Nav body (`p-[16px]`, `gap-[20px]` between sections):
  - **CATALOG** section (label `11px` SemiBold, tracked, secondary color): Cakes, Categories, Sizes, Flavors, Colors, Toppers — each a `h-[36px]` pill row (`rounded-[16px]`), active item gets `bg-[var(--color-brand-primary)]` + white text/icon, inactive items plain secondary-color text/icon
  - **ORDERS** section — **NOT dimmed/disabled in the design**: All Orders, Delivery Areas, Delivery Calendar, Promo Codes — same row style as Catalog items, but none of these routes exist yet (Phase 6), so render them as inert (no `href`) but visually matching the *active-style* undimmed treatment, not the Money/Team dimmed treatment
  - **MONEY** section — dimmed (`opacity-40` icon, `opacity-50` text): Expenses, Analytics
  - **TEAM** section — dimmed same as Money: Admins & Roles
- Footer (`h-[64px]`, border-t, `bg-[var(--color-bg-subtle)]`, `px-[16px]`): avatar (32px circle) + name (Cairo Medium 13px) + role label ("Admin", Cairo Regular 11px secondary) on the left, logout icon button on the right. **Deviation (human-approved, not in Figma): add an EN/AR language toggle here too**, next to the logout icon.

### Admin - Cakes (canvas `129:2`)
- `topBar`: title "Cakes", primary button "+ Add Cake"
- `categoryFilters`: `FilterChip` row — All, Birthday, Wedding, Graduation, Bento, Custom, Candy Corner (7 chips, `gap-[8px]`)
- `candyCornerSubFilters` (only when Candy Corner selected): "Subcategory:" label + chips — All, Cupcakes, Pops, Popsicles, Dessert Cups, `pl-[16px]`, smaller scale (~85% of normal chip size per the Figma numbers)
- `cakesTable`: header CAKE (sortable, caret) / CATEGORY / PRICE (sortable, caret) / STATUS / ACTIONS; rows: 40px thumbnail, bilingual name (`14px` medium EN / `12px` regular AR, `dir="auto"` on the Arabic line), category (secondary text), price "EGP 450" format (medium, primary color — **note the "EGP" prefix comes BEFORE the number**, differs from the built version's `${price} EGP` suffix format), Switch, Row Actions
- `pagination`: "Showing 1–6 of 24 cakes" left, numbered page pills right (32px circles, active pill brand-primary bg)

### Admin - Cake Form (canvas `130:1309`)
- `topBar`: title "New Cake" (or presumably the cake's name when editing — not shown in this frame, use judgement: title should read the cake's English name when editing, "New Cake" when creating), Cancel (secondary/orange pill) + Save Cake (primary pill) buttons
- `imageCard` (320px fixed-width card, left column): "Cake Images" title, 2×2 grid of `130px` square tiles (`gap-[10px]`), primary tile gets a 2px brand-primary border + "PRIMARY" pill badge (top-left, brand-primary bg, white text) + a star/select control (top-right, 20px circle), one "addTile" slot with dashed border + "Add photo" icon+label when under 4 images. Helper text below: "Upload multiple photos. Choose one as the primary image — it's what shows in Shop and on the Home page."
- `fieldsCard` (flex-1, right column, `p-[24px]`, `gap-[16px]`): "Cake Details" title, then:
  - Row: Category select (flex-1) + Price (EGP) input (`w-[200px]`)
  - Candy Corner Subcategory select (full width, only rendered when Category = Candy Corner) — helper text "Required when Category is Candy Corner (Cupcakes, Pops, Popsicles, Dessert Cups)."
  - Row: Cake Name (English) + Cake Name (Arabic), each flex-1
  - Row: Description (English) + Description (Arabic), each flex-1
  - `togglesSection` (border-t, `pt-[8px]`, `gap-[12px]`): "Active" toggle ("Inactive cakes are hidden from the storefront.") + **"Available as Fake Cake" toggle ("Lets customers order a display-only version of this design. Not shown for Bento or Candy Corner categories.")** — this second toggle is the new `cakes.allow_fake` field (see Task 1)

### Admin - Categories (canvas `132:2`)
- `topBar`: title "Categories", primary button (label not fully captured, use "+ Add Category")
- Helper text: "Drag rows by the handle to reorder. Candy Corner's 4 subcategories reorder independently within their group."
- `categoriesTable`: header — (drag handle col, blank) / CATEGORY / SUBCATEGORIES / ACTIONS (note: no ACTIVE column visible in this table's header per the metadata — re-verify against the live frame before removing the Switch from category rows, since the row content still needs an active toggle somewhere; if the header truly omits it, keep the Switch but don't add an "ACTIVE" header label, or flag this as a Figma inconsistency to note in ARCHITECTURE.md rather than guess)
- Rows: drag handle (3×2 dot grid icon) + bilingual name (EN 14px / AR 12px) + subcategories summary ("—" for normal categories, "4 subcategories" for Candy Corner, with a chevron next to Candy Corner's name for expand/collapse) + Row Actions
- Candy Corner's 4 subcategory rows: indented (`42px` extra left offset inside the name column, small dash/tick marker before the name), smaller row height (`56px` vs `64px`), each showing its size-step rule as a secondary-column description (e.g. "Steps of 6, starting at 6 and after 12 then steps of 12" for Cupcakes, "Steps of 12, starting at 12" for the other three) instead of a subcategories count — this is descriptive text, not an editable field, don't try to make it editable
- `addSubcategoryRow`: a "+ Add Subcategory" row nested at the bottom of Candy Corner's subcategory group — **this is the missing feature**; build it as a real affordance that opens `CategoryFormDialog` with `parentId` fixed to Candy Corner's id (closing the previously-deferred gap from Task 9 of the original Phase 5 plan)

### Admin - Flavors (canvas `133:2`)
- `topBar`: title "Flavors", primary button "+ Add Flavor" (not fully captured, infer from pattern)
- Table header: FLAVOR / RESTRICTED TO / ACTIVE / ACTIONS
- **"RESTRICTED TO" column is new** — must be built. Values seen: "Unrestricted — available everywhere" (when no `category_flavors` rows exist for that flavor) vs. a specific restriction like "Dessert Cups only". This requires querying `category_flavors` joined with `categories` per flavor and summarizing which categories (if any) restrict it. Rows: bilingual name (14px/12px), restriction summary text (secondary color), Switch, Row Actions

### Admin - Colors (canvas `133:1586`)
- `topBar`: title "Colors", primary button "+ Add Color"
- Table header: (blank swatch col) / COLOR / HEX / ACTIVE / ACTIONS
- **"HEX" column shows the hex code as visible text** (e.g. "#FFFFFF"), separate from the swatch circle (28px ellipse) — the built version only used hex as a CSS background, never displayed it as text. Rows: swatch circle, bilingual name, hex text (secondary color, monospace-ish per the Figma but Cairo font is fine, matching the rest), Switch, Row Actions

### Admin - Sizes (canvas `133:1739`)
- `topBar`: title "Sizes", primary button "+ Add Size"
- Category selector at top (already using real `Select` per the original Phase 5 plan) — helper text: "Sizes are managed per category. Candy Corner subcategories (Cupcakes, Pops, Popsicles, Dessert Cups) each have their own quantity-based size list."
- Table header: SIZE / TIERS AVAILABLE / ACTIVE / ACTIONS
- **"SIZE" column combines min/max into one string** like `"8>12 servings"`, `"24>30 servings"` — matches the storefront's existing `24>30` size notation convention (already used elsewhere in the app per ARCHITECTURE.md). The built version showed separate Min/Max columns instead.
- **"TIERS AVAILABLE" column is new** — computed text: "No tiers (below threshold)" when the size has no `size_tiers` rows, otherwise a human list like "1, 2, or 3 tiers" / "1, 2, 3, or 4 tiers" derived from the actual `tiers` joined via `size_tiers` for that size row.

### Admin - Toppers (canvas `133:1868`)
- `topBar`: title "Toppers", primary button "+ Add Topper"
- Table header: (blank thumbnail col) / TOPPER / COLOR VARIANTS / ACTIVE / ACTIONS
- Rows: 40px rounded thumbnail (from `image_url`), bilingual name, color variants shown as **overlapping 18px circle swatches** (`-ml` overlap, not side-by-side with gaps like the built version) followed by "N variants" text, or "No color variants" text when `has_color_variants` is false. Switch, Row Actions.

### Shared components — exact styling to match
- **Switch**: `w-[40px] h-[22px] rounded-[11px]`, on-state bg `#3e7d4c`, knob `18px` circle, `2px` inset
- **Row Actions**: two `32px` square buttons (`rounded-[8px]`) side by side, `gap-[4px]` — edit icon secondary color, delete icon `#c23b2e` red, both `16px` icon size centered
- **Table Header Row**: `h-[44px]`, `bg-[var(--color-bg-subtle)]`, `px-[24px]`, column labels `12px` SemiBold secondary, `tracking-[0.48px]`, uppercase copy (already uppercase in Figma text, not CSS `text-transform`)
- **Table Row**: `h-[60-64px]` (64px for Cakes/Toppers with thumbnails, 60px for text-only tables like Flavors/Colors/Sizes), alternating white/`bg-subtle` background stripe (even/odd), `px-[24px]`, `gap-[16px]`

## Global Constraints

- All money is EGP, `numeric(10,2)` (CLAUDE.md hard rule 7) — the Figma "EGP 450" prefix-format display is a copy/formatting change only, not a schema or currency-logic change.
- Every UI surface supports EN/AR + RTL (CLAUDE.md hard rule 6) — every new/changed string goes through next-intl; logical Tailwind properties throughout (this was already true of the original Phase 5 build and must stay true).
- **Never commit automatically.** Stage and stop; propose a commit message. This plan's tasks, if executed via subagent-driven-development, follow that skill's own commit-per-task convention — the human has already approved this tradeoff for this session (see prior conversation) after it was flagged as a deviation from the stage-only default. State it again at the end of this plan's execution regardless, since it bears repeating per task.
- **Never run a dev server or open a browser to self-test** (CLAUDE.md hard rule 2). Verify with `npx tsc --noEmit` / `npm run lint`; the human tests the UI manually — this is especially important for this plan since it's pure visual/UX work that can't be verified any other way in this environment.
- Migration workflow: write the file, run `npx --yes supabase db push` (confirmed working and linked this session), verify via `npx --yes supabase migration list`.
- Reuse existing components: `Button` already has `brand-primary`/`brand-ghost`/`brand-secondary`(new, see Task 2) variants pattern; `Select`/`Switch` from `src/components/ui/`; don't reinvent primitives that already exist unless their current styling genuinely doesn't match Figma (document why in the task if so).
- The `AdminTable`/`RowActions` shared components (`src/components/admin/AdminTable.tsx`, `RowActions.tsx`) already exist and are used by 5 of the 6 CRUD pages — restyle them in place rather than creating parallel versions, since every page must pick up the fix at once for visual consistency.

---

### Task 1: Schema — `cakes.allow_fake`, storefront eligibility check

**Files:**
- Create: `supabase/migrations/20260816100000_cakes_allow_fake.sql`
- Modify: `src/types/catalog.ts` (`Cake` type)
- Modify: `src/lib/catalog/queries.ts` (every `cakes` `.select()` that already lists columns explicitly — `getTrendingCakesByCategory`, `getCakesByCategorySlug`, `getAllCakes`, `getCakeById` — add `allow_fake`)
- Modify: `src/components/storefront/CakeCustomizer.tsx` (the `allowFakeCake` computation)

**Interfaces:**
- Produces: `cakes.allow_fake boolean not null default true`; `Cake.allow_fake: boolean` in the TS type.
- Consumes: `CakeCustomizer`'s existing category-slug-based `allowFakeCake` boolean (currently `true` unless category is Bento/Candy Corner) — this task ANDs it with the new `cake.allow_fake` field, it doesn't replace the category check.

- [ ] **Step 1: Write and push the migration**

```sql
alter table public.cakes add column allow_fake boolean not null default true;
```

Run `npx --yes supabase db push` from the repo root, then `npx --yes supabase migration list` to confirm `20260816100000` shows `local` == `remote`.

- [ ] **Step 2: Update `src/types/catalog.ts`**

Add `allow_fake: boolean;` to the `Cake` type, after `featured`.

- [ ] **Step 3: Update every explicit `cakes` select in `src/lib/catalog/queries.ts`**

Read the file first — there are 4 functions with a hardcoded column list (`getTrendingCakesByCategory`, `getCakesByCategorySlug`, `getAllCakes`, `getCakeById`), each doing `.select("id, category_id, name, description, base_price, primary_image_url, featured, sort_order")`. Add `allow_fake` to that list in all 4 (right after `featured` to match the type's field order, though field order in a `.select()` string doesn't functionally matter — just keep it readable).

- [ ] **Step 4: Wire the check into `CakeCustomizer.tsx`**

Read the file first to find the exact current `allowFakeCake` computation (search for `allowFakeCake`). It's currently derived purely from the top-level category slug (`!== "bento" && !== "candy-corner"`, or similar — read the actual code, don't assume the exact expression). Change it to also require `cake.allow_fake` — the cake object is already available in this component's props/state (it's the cake being customized), so this should be a straightforward `&&` addition, e.g.:

```typescript
const allowFakeCake = cake.allow_fake && categorySlug !== "bento" && categorySlug !== "candy-corner";
```

(adjust variable names to match what's actually in the file).

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260816100000_cakes_allow_fake.sql src/types/catalog.ts src/lib/catalog/queries.ts src/components/storefront/CakeCustomizer.tsx
git commit -m "$(cat <<'EOF'
Add cakes.allow_fake, gate storefront Fake Cake option on it

Closes a gap surfaced by the Cake Form's Figma design (an
"Available as Fake Cake" toggle per cake) that had no schema
backing. Storefront eligibility now ANDs the existing
category-based check with this new per-cake flag.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Admin shell — sidebar rebuild, EN/AR toggle, shared component restyle

**Files:**
- Modify: `src/components/admin/AdminSidebarNav.tsx` (near-total rewrite)
- Modify: `src/components/admin/AdminNavItem.tsx` (styling only — pill shape, active/dimmed states)
- Modify: `src/components/admin/RowActions.tsx` (styling — 32px square buttons, exact colors)
- Modify: `src/components/admin/AdminTable.tsx` (styling — header/row heights, alternating stripe, radius)
- Modify: `src/components/ui/button.tsx` (add a `brand-secondary` variant if one doesn't already exist — check first; Figma's Cake Form "Cancel" button uses the orange `#fc5c00` fill, distinct from existing `brand-primary`/`brand-ghost`)
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: Design Reference's "Admin Sidebar Nav" section above (exact structure/copy/dimensions) and "Shared components" section (Switch/Row Actions/Table Header Row/Table Row exact styling).
- Produces: no prop-shape changes to `AdminTable`/`RowActions`/`AdminNavItem` (their existing `props` interfaces from the original Phase 5 build stay the same — only the Tailwind classes inside them change) — this keeps every page that already consumes them working without edits to those pages.

- [ ] **Step 1: Rewrite `AdminSidebarNav`**

Read the current file first. Rebuild to match the Design Reference exactly:
- `w-[240px]` fixed (both expanded and... check whether the Figma shows a "Collapsed" variant anywhere in the metadata already pulled — it wasn't captured in this session's `get_design_context` calls, only "Expanded" state was seen. If no collapsed-state design exists, keep the existing collapse/expand behavior functionally but apply it as a width transition from the new 240px baseline, not a redesign of the collapsed state — don't invent new collapsed-state visuals not seen in Figma).
- Header: `h-[64px]` border-b, "yCakes Admin" (Baloo 2 SemiBold 18px) + collapse toggle icon button.
- Four sections in order: CATALOG (6 real links, already correct), ORDERS (4 items: All Orders / Delivery Areas / Delivery Calendar / Promo Codes — `href: null`, same non-clickable treatment as before, but styled WITHOUT the dimmed `opacity-40/50` treatment — full-opacity secondary-color text/icon, matching Figma), MONEY (Expenses/Analytics, `href: null`, dimmed `opacity-40/50`), TEAM (Admins & Roles, `href: null`, dimmed).
- Footer: `h-[64px]` border-t `bg-[var(--color-bg-subtle)]`, avatar (32px circle — use a generic placeholder avatar, e.g. an initial-letter circle or a lucide `User` icon in a circle, since there's no real avatar image system in this app; don't hotlink the Figma placeholder SVG asset) + name + role ("Admin") on the left, **language toggle + logout icon** on the right (new addition, not in Figma — see Step 2).
- The user's real name: fetch from `profiles` (needs `first_name`/`last_name` per ARCHITECTURE.md's Auth section) in `requireAdmin.ts` or a new query, pass down as a prop to `AdminSidebarNav` from `admin/layout.tsx` (Server Component) rather than fetching client-side — `AdminSidebarNav` is currently a Client Component with no props; give it an optional `adminName?: string` prop, falling back to something reasonable (e.g. the translated word "Admin") if unavailable.

- [ ] **Step 2: Add the EN/AR toggle**

Find how the storefront's `NavBar` implements its language toggle (search `src/components/layout/NavBar.tsx` or wherever it lives) and reuse the exact same mechanism (likely a locale-aware link/router push swapping `/en/...` ↔ `/ar/...`, or a `LanguageToggle` component if one already exists as a standalone component — check `src/components/` for one before building a new one). Place it in the sidebar footer next to the logout icon, using a compact icon-button style consistent with the footer's other icon (logout).

- [ ] **Step 3: Restyle `AdminNavItem`**

Read the current file. Adjust to: `h-[36px]`, `rounded-[16px]`, `px-[12px] py-[8px]`, `gap-[12px]`, active state `bg-[var(--color-brand-primary)]` + white icon/text (Cairo SemiBold 14px), inactive state secondary-color icon/text (Cairo Medium 14px), dimmed variant (new — add a `dimmed?: boolean` prop) applying `opacity-40` to the icon wrapper and `opacity-50` to the text, used by the Money/Team sections only.

- [ ] **Step 4: Restyle `RowActions`**

Read the current file (it has the `editHref` extension from the original Phase 5's Task 10 — preserve that). Adjust the two buttons to `size-[32px]` `rounded-[8px]`, icon `16px`, delete icon color `text-[#c23b2e]` (or map to whatever CSS variable/Tailwind class in `globals.css` already represents this — check for a `--color-state-error` or `destructive` token before hardcoding the hex).

- [ ] **Step 5: Restyle `AdminTable`**

Read the current file. Header row: `h-[44px]`, `bg-[var(--color-bg-subtle)]` (check `globals.css` for the actual token name/class, likely already used elsewhere in the storefront), `px-[24px]`, label styling `text-[12px] font-semibold tracking-[0.48px] uppercase` (the Figma text was already uppercase content, but applying CSS `uppercase` is more robust for future column labels typed in mixed case — apply it). Data rows: alternate `bg-white`/`bg-subtle` stripe based on row index (needs `AdminTable` to know each row's index — use the `.map()` index already available when rendering `rows`), `px-[24px]`, `h-[60px]` default (pages with thumbnails — Cakes, Toppers — will need `h-[64px]`; make row height a column-independent constant the table itself decides based on whether any column's `render` returns something requiring more vertical space, or simpler: add an optional `rowHeight?: "60" | "64"` prop defaulting to `60`, and have Cakes/Toppers pass `"64"`).

- [ ] **Step 6: Add `brand-secondary` Button variant (if missing)**

Check `src/components/ui/button.tsx`'s existing variants first. If nothing matches the Figma "Secondary" style (orange `#fc5c00` fill, dark text `#341004`), add a `brand-secondary` variant following the same pattern as the existing `brand-primary`/`brand-ghost` variants (pill shape, `rounded-full`).

- [ ] **Step 7: Add/verify translation keys**

Add any new keys needed for the sidebar's ORDERS section items (`Admin.nav.allOrders`, `deliveryAreas`, `deliveryCalendar`, `promoCodes`) and the language toggle (reuse whatever key the storefront's toggle already uses if it's a shared, non-namespaced string — check first) to both `messages/en.json` and `messages/ar.json`.

- [ ] **Step 8: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/AdminSidebarNav.tsx src/components/admin/AdminNavItem.tsx src/components/admin/RowActions.tsx src/components/admin/AdminTable.tsx src/components/ui/button.tsx messages/en.json messages/ar.json src/lib/admin/requireAdmin.ts "src/app/[locale]/(admin)/admin/layout.tsx"
git commit -m "$(cat <<'EOF'
Rebuild admin sidebar and shared table components to match Figma

Sidebar gains the real 4-section structure (Catalog/Orders/Money/Team,
with Orders undimmed unlike Money/Team) and a user footer, plus an
EN/AR toggle (not in Figma, added per owner request). AdminTable/
RowActions/AdminNavItem get exact Figma spacing and colors without
changing their prop interfaces, so every consuming page picks up the
fix automatically.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Colors + Flavors pages — visual fixes + new columns

**Files:**
- Modify: `src/components/admin/colors/ColorsPageContent.tsx`
- Modify: `src/components/admin/flavors/FlavorsPageContent.tsx`
- Modify: `src/app/[locale]/(admin)/admin/flavors/page.tsx` (needs to fetch `category_flavors` + `categories` to compute the restriction summary)
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: Design Reference's "Admin - Colors" and "Admin - Flavors" sections; the restyled `AdminTable` from Task 2.

- [ ] **Step 1: Colors — add the HEX text column**

Read `ColorsPageContent.tsx`. Currently the swatch column shows a colored circle + bilingual name in one cell, with no separate hex-text column. Add a new `AdminTableColumn` for HEX, rendering `row.hex_code ?? "—"` in secondary text color, positioned between the name column and the Active column (matching the Figma header order: COLOR / HEX / ACTIVE / ACTIONS). Update the `AdminTable columns` array and add a `t("hex")` translation key (`Admin.table.hex`: "Hex" / "السداسي").

- [ ] **Step 2: Flavors — add the "RESTRICTED TO" column**

This needs data the page doesn't currently fetch. Modify `src/app/[locale]/(admin)/admin/flavors/page.tsx` to additionally query `category_flavors` joined to `categories` for the restriction info:

```typescript
const { data: restrictions, error: restrictionsError } = await supabase
  .from("category_flavors")
  .select("flavor_id, categories(name)")
  .order("flavor_id");
if (restrictionsError) throw restrictionsError;
```

Build a `Record<string, string[]>` mapping `flavor_id` → array of restricting category English names, pass it to `FlavorsPageContent` as a new prop (e.g. `restrictionsByFlavor: Record<string, string[]>`).

In `FlavorsPageContent.tsx`, add a new column between name and price-modifier (matching Figma's FLAVOR / RESTRICTED TO / ACTIVE / ACTIONS order — this means price-modifier and restriction column order needs reconciling; the built page currently has FLAVOR / PRICE MODIFIER / ACTIVE / ACTIONS — check whether to keep price-modifier as a 5th column after restriction, or whether Figma's frame simply didn't show it because this design predates price fields being added; **don't silently drop the price-modifier column** — insert RESTRICTED TO as an additional column, order: FLAVOR / RESTRICTED TO / PRICE MODIFIER / ACTIVE / ACTIONS, prioritizing not losing existing functionality over exact Figma column order). Render logic: `restrictionsByFlavor[row.id]?.length ? restrictionsByFlavor[row.id].join(", ") + " only"` matching the Figma copy pattern ("Dessert Cups only") for a single restriction, or a reasonable join for multiple (e.g. "Cupcakes, Pops only") : `t("unrestricted")` ("Unrestricted — available everywhere").

Add translation keys: `Admin.table.restrictedTo` ("Restricted To" / "مقيّد بـ"), `Admin.table.unrestricted` ("Unrestricted — available everywhere" / Arabic equivalent), and the " only" suffix pattern — consider a single interpolated key `Admin.table.restrictedToList`: `"{categories} only"` / Arabic equivalent, used as `t("restrictedToList", { categories: list.join(", ") })`.

- [ ] **Step 3: Fix the "EGP 450" price-prefix format on Cakes (carried here since it's a small shared concern)**

Actually — this belongs in Task 4 (Cakes page), not here. Skip this step; it's listed in Task 4 instead. (This note exists to prevent duplicate work — do not touch Cakes' price formatting in this task.)

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/colors/ColorsPageContent.tsx src/components/admin/flavors/FlavorsPageContent.tsx "src/app/[locale]/(admin)/admin/flavors/page.tsx" messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Colors' hex-text column and Flavors' restriction-summary column

Both were present in the Figma design and missing from the original
build. Flavors' restriction summary is computed server-side from
category_flavors, matching the storefront's existing unrestricted-
by-default semantics.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Cakes list + Sizes pages — combined size notation, tiers-available column, price format

**Files:**
- Modify: `src/components/admin/cakes/CakesListContent.tsx`
- Modify: `src/components/admin/sizes/SizesPageContent.tsx`
- Modify: `src/app/[locale]/(admin)/admin/sizes/page.tsx` (needs `size_tiers`/`tiers` data)
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: Design Reference's "Admin - Cakes" and "Admin - Sizes" sections.

- [ ] **Step 1: Cakes — fix price display format**

In `CakesListContent.tsx`, find where `row.base_price` is rendered (the PRICE column). Change from whatever suffix format is currently used to the Figma's prefix format: `` `EGP ${row.base_price}` `` (or use the existing `Common.egp` translation key with interpolation if that's cleaner — check how Flavors' page does its EGP suffix and decide whether a matching prefix key makes sense, e.g. `t("egpPrice", { amount: row.base_price })` with the JSON value `"EGP {amount}"` / Arabic equivalent — Arabic RTL will need its own natural word order, don't assume the same prefix pattern works for Arabic, translate appropriately).

- [ ] **Step 2: Sizes — combine min/max into one SIZE column**

Read `SizesPageContent.tsx`. Currently `minQty`/`maxQty` are two separate `AdminTable` columns. Merge them into one "SIZE" column rendering `` `${row.min_qty}>${row.max_qty} ${t(`unit${capitalize(row.unit)}`)}` `` (reuse the existing unit-translation keys already in the file, e.g. `unitServings`/`unitQuantity`/`unitCm`). Remove the separate Min/Max columns and their now-unused `minQty`/`maxQty` translation keys if nothing else references them (check first — `SizeFormDialog.tsx` still needs separate Min/Max INPUT fields for editing, only the TABLE column display is merging, not the form).

- [ ] **Step 3: Sizes — add the "TIERS AVAILABLE" computed column**

This needs `size_tiers`/`tiers` data the page doesn't currently fetch. Modify `src/app/[locale]/(admin)/admin/sizes/page.tsx` to additionally fetch, for the currently-selected category's sizes, their tier availability:

```typescript
const { data: sizeTiers, error: sizeTiersError } = selectedCategoryId
  ? await supabase
      .from("size_tiers")
      .select("size_id, tiers(tier_count)")
      .in("size_id", (sizes ?? []).map((s) => s.id))
  : { data: [], error: null };
if (sizeTiersError) throw sizeTiersError;
```

Build a `Record<string, number[]>` mapping `size_id` → sorted array of available `tier_count` values, pass to `SizesPageContent` as a new prop (e.g. `tiersBySizeId: Record<string, number[]>`).

In `SizesPageContent.tsx`, add the TIERS AVAILABLE column: if `tiersBySizeId[row.id]` is empty/undefined, render `t("noTiers")` ("No tiers (below threshold)"); otherwise render a human list like "1, 2, or 3 tiers" — build this with an Oxford-comma-aware join helper (e.g. `[1,2,3] → "1, 2, or 3"`, `[1,2,3,4] → "1, 2, 3, or 4"`, `[1] → "1"`) using the existing `t("tier")`/`t("tiers")` pluralization convention if one exists in this codebase already (check `messages/en.json` for how tier counts are phrased on the storefront's `CakeCustomizer` for consistency) rather than inventing new phrasing.

Add translation keys: `Admin.table.tiersAvailable` ("Tiers Available" / Arabic), `Admin.table.noTiers` ("No tiers (below threshold)" / Arabic), `Admin.table.size` ("Size" / Arabic, replacing the old separate Min/Max header labels in the table — keep the form's own `minQty`/`maxQty` labels as-is).

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/cakes/CakesListContent.tsx src/components/admin/sizes/SizesPageContent.tsx "src/app/[locale]/(admin)/admin/sizes/page.tsx" messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Match Sizes/Cakes list columns to Figma: combined size notation, tiers-available, EGP-prefix price

Sizes now shows one "8>12 servings"-style column instead of separate
Min/Max, plus a computed tiers-available summary joined from
size_tiers/tiers. Cakes' price display switches to Figma's
"EGP 450" prefix format.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Toppers page — overlapping swatch display; Categories page — subcategories column + real "+ Add Subcategory"

**Files:**
- Modify: `src/components/admin/toppers/ToppersPageContent.tsx`
- Modify: `src/components/admin/categories/CategoriesPageContent.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: Design Reference's "Admin - Toppers" and "Admin - Categories" sections.

- [ ] **Step 1: Toppers — overlapping color-variant swatches**

Read `ToppersPageContent.tsx`'s color-variants column render logic. Change from side-by-side `gap-1` swatches to overlapping (`-ml-2` or similar negative margin on all but the first, each with a `border-2 border-white` or `border-bg-surface` ring so the overlap reads cleanly against the table's alternating row stripe from Task 2), followed by `t("variantsCount", { count: N })` text ("3 variants") instead of the current inline count — check whether a `variantsCount` key already exists (it likely doesn't) and add it to both message files with proper pluralization if next-intl's ICU plural syntax is already used elsewhere in this codebase (check `messages/en.json` for `{count, plural, ...}` patterns before deciding whether to add one here or keep it simple).

- [ ] **Step 2: Categories — add the SUBCATEGORIES column**

Read `CategoriesPageContent.tsx`. Top-level category rows currently don't show a subcategories summary. Add a column (or inline text within the existing row layout, matching Figma's column position between name and actions) rendering "—" for every category except Candy Corner, and `t("subcategoriesCount", { count: subcategories.length })` ("4 subcategories") for Candy Corner. This is a display-only addition — no new data fetch needed, `subcategories.length` is already computed in this file.

- [ ] **Step 3: Categories — build the real "+ Add Subcategory" row**

This is the feature explicitly deferred during the original Phase 5 build (Task 9's ruling) and confirmed by the Figma design as a real, intended affordance — build it now. Add a row rendered at the bottom of the Candy Corner subcategory group (only when `candyCornerExpanded` is true), styled as a plain button/link row (not a full table row — match Figma's simpler "+ Add Subcategory" text-only treatment), calling `setEditing(null)` but ALSO needing to communicate "this new category's parent should be Candy Corner's id" to `handleSave`.

Read the current `handleSave`/`onSave` wiring — Task 9's original ruling noted `onSave`'s parent-id resolution only supports top-level creation (`parentId` always resolves to `null` for new categories). Fix this properly now: add a second piece of state, e.g. `const [addingSubcategoryUnderCandyCorner, setAddingSubcategoryUnderCandyCorner] = useState(false)`, set it `true` when the new "+ Add Subcategory" row is clicked (alongside `setEditing(null)`), and thread it into the `onSave` call's parent-id resolution so a save while this flag is true inserts with `parent_id = candyCorner.id` instead of `null`. Reset the flag on save/cancel alongside `editing`.

- [ ] **Step 4: Add translation keys**

`Admin.table.subcategoriesCount` ("{count} subcategories" / Arabic), `Admin.table.addSubcategory` ("+ Add Subcategory" / Arabic), `Admin.table.variantsCount` ("{count} variants" / Arabic) if not already added in Step 1.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/toppers/ToppersPageContent.tsx src/components/admin/categories/CategoriesPageContent.tsx messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Add Toppers' overlapping swatches, Categories' subcategory count + real add-subcategory

Closes the subcategory-creation gap deferred during the original
Phase 5 build — the Figma design confirms it's a real intended
feature (an explicit "+ Add Subcategory" row), not something to
keep deferring.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Cake Form — image grid rebuild, Fake Cake toggle wiring, top bar buttons

**Files:**
- Modify: `src/components/admin/cakes/CakeForm.tsx`
- Modify: `src/components/admin/ImageUploader.tsx` (the multi-image grid layout needs to match Figma's fixed 2×2 130px-tile layout, not flex-wrap)
- Modify: `messages/en.json`, `messages/ar.json`

**Interfaces:**
- Consumes: Design Reference's "Admin - Cake Form" section; `cakes.allow_fake` from Task 1; `brand-secondary` Button variant from Task 2.

- [ ] **Step 1: Rebuild the image grid layout**

Read `ImageUploader.tsx`. Currently `flex flex-wrap` with `size-24` (96px) tiles. Figma shows a fixed 2-column grid of `130px` tiles with `10px` gaps, primary tile gets a 2px brand-primary border + a "PRIMARY" pill badge (top-left) instead of the current star-icon-only treatment. Since `ImageUploader` is shared between the Cake Form (`multiple={true}`) and Toppers (`multiple={false}`), make this grid layout change apply specifically to the `multiple={true}` case — Toppers' single-image mode doesn't need a 2-column grid or a "PRIMARY" badge (there's only ever one image). Add a "PRIMARY" text badge matching the Figma copy exactly, replacing (or supplementing — check whether the star icon should stay as a secondary indicator or be fully replaced) the current star-only primary indicator.

- [ ] **Step 2: Wire the "Available as Fake Cake" toggle**

Read `CakeForm.tsx`. Add a second `Switch` in the `togglesSection`, bound to a new `allowFake` state (`useState(cake?.allow_fake ?? true)`), with the label/helper text from the Design Reference ("Available as Fake Cake" / "Lets customers order a display-only version of this design. Not shown for Bento or Candy Corner categories."). Include `allow_fake: allowFake` in the save payload (both insert and update branches — this file already has the established `payload` object pattern from the original build, add the field there).

- [ ] **Step 3: Top bar — Cancel + Save Cake buttons**

Verify the current top bar matches: title (cake's English name when editing, "New Cake" when creating — check current behavior, likely already close), Cancel button (now using the new `brand-secondary` variant from Task 2 instead of `brand-ghost`, per Figma) + Save Cake button (existing `brand-primary`, likely already correct).

- [ ] **Step 4: Translation keys**

Add `Admin.table.allowFake` ("Available as Fake Cake" / Arabic) and `Admin.table.allowFakeHelper` (the helper sentence / Arabic) if not reusing existing keys.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/cakes/CakeForm.tsx src/components/admin/ImageUploader.tsx messages/en.json messages/ar.json
git commit -m "$(cat <<'EOF'
Rebuild Cake Form's image grid to match Figma, wire Available-as-Fake-Cake toggle

2x2 fixed-tile grid with a PRIMARY badge replaces the flex-wrap
layout (multi-image mode only — Toppers' single-image ImageUploader
usage is unaffected). New toggle writes cakes.allow_fake.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Phase 5 follow-ups — Pagination query params, topper_colors atomicity

**Files:**
- Modify: `src/components/storefront/Pagination.tsx` (add optional extra-query-param support, used by the storefront too — must stay backward compatible)
- Modify: `src/components/admin/cakes/CakesListContent.tsx` (pass the extra params through)
- Create: a new migration + RPC for atomic `topper_colors` writes
- Modify: `src/components/admin/toppers/ToppersPageContent.tsx` (call the new RPC instead of delete-then-insert)

**Interfaces:**
- Produces: `Pagination` gains an optional `extraParams?: Record<string, string>` prop, defaulting to `undefined` (no behavior change for existing storefront callers that don't pass it).
- Produces: a new Postgres RPC (name it `fn_replace_topper_colors(p_topper_id uuid, p_color_ids uuid[])`, `security definer`, wraps the delete+insert in one transaction) — follow the same pattern as the existing `create_order` RPC (`supabase/migrations/20260815150100_create_order_rpc.sql`) for structure/security conventions.

- [ ] **Step 1: Fix `Pagination`'s dropped query params**

Read `src/components/storefront/Pagination.tsx` in full. Add an optional `extraParams?: Record<string, string>` prop. In `pageHref`, when building the URL, merge `extraParams` into the query string alongside `page` (e.g. via `URLSearchParams`), preserving the existing `basePath` (no `?page=`) special case for page 1 — actually, once there are `extraParams`, page 1 can no longer omit the query string entirely if other params need to survive; adjust the logic so page 1 with non-empty `extraParams` still includes those params (just omits `page=1` specifically), while page 1 with no `extraParams` keeps the current clean-URL behavior. Verify no existing storefront caller breaks by checking every place `<Pagination` is used (should just be `ShopBrowse.tsx` and now `CakesListContent.tsx`) — the storefront call sites don't pass `extraParams`, so they're unaffected.

- [ ] **Step 2: Wire it into the Cakes admin list**

In `CakesListContent.tsx`, pass `extraParams={{ category: activeCategory ?? "", subcategory: activeSubcategory ?? "", sort, dir }}` (filter out empty-string entries before passing, so the URL doesn't carry pointless `category=`) to the existing `<Pagination>` call.

- [ ] **Step 3: Atomic `topper_colors` RPC**

Read `supabase/migrations/20260815150100_create_order_rpc.sql` first for the established `security definer` + role-check pattern used in this codebase. Create `supabase/migrations/20260816110000_replace_topper_colors_rpc.sql`:

```sql
create or replace function public.fn_replace_topper_colors(p_topper_id uuid, p_color_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can modify topper colors';
  end if;

  delete from public.topper_colors where topper_id = p_topper_id;

  if array_length(p_color_ids, 1) > 0 then
    insert into public.topper_colors (topper_id, color_id)
    select p_topper_id, unnest(p_color_ids);
  end if;
end;
$$;
```

Push it (`npx --yes supabase db push`, verify via `migration list`).

- [ ] **Step 4: Call the RPC from `ToppersPageContent.tsx`**

Read the current `handleSave`'s topper_colors delete-then-insert sequence. Replace both calls with one:

```typescript
const { error: colorsError } = await supabase.rpc("fn_replace_topper_colors", {
  p_topper_id: topperId,
  p_color_ids: value.color_ids,
});
if (colorsError) { setError(t("saveFailed")); return; }
```

(adjust to match the file's exact existing variable names/error-handling shape).

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Update TASKS.md**

Check off the two follow-up line items (Pagination query params, topper_colors atomicity) that were added to TASKS.md's Phase 5 section during the original build's wrap-up — read the current TASKS.md first to find the exact line text, don't guess.

- [ ] **Step 7: Commit**

```bash
git add src/components/storefront/Pagination.tsx src/components/admin/cakes/CakesListContent.tsx src/components/admin/toppers/ToppersPageContent.tsx supabase/migrations/20260816110000_replace_topper_colors_rpc.sql TASKS.md
git commit -m "$(cat <<'EOF'
Close two Phase 5 follow-ups: Pagination query params, atomic topper_colors writes

Pagination gains an optional extraParams prop (backward compatible,
storefront callers unaffected) so the Cakes admin list's filter/sort
survives page navigation. topper_colors edits now go through a single
security-definer RPC instead of a non-transactional delete-then-insert.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Documentation — update ARCHITECTURE.md, TASKS.md, final consolidated commit message

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `TASKS.md`

**Interfaces:** None.

- [ ] **Step 1: Add a note under the existing Phase 5 ARCHITECTURE.md section**

Document: the design-alignment pass happened after the fact (original build didn't consult Figma — flagged and corrected this session), the new `cakes.allow_fake` field and its storefront wiring, the RPC-based `topper_colors` write, the `Pagination` extension, and the Categories subcategory-creation feature landing. Also note any genuine Figma inconsistency discovered during implementation (e.g. if Task 5's Categories table header ambiguity around the Active column turned out to be real — check what that task actually found and document it here rather than leaving it unresolved).

- [ ] **Step 2: TASKS.md**

Confirm the two follow-up items from Task 7 are checked off (should already be done in Task 7's own Step 6 — verify, don't duplicate).

- [ ] **Step 3: Type-check/lint one more time across the whole tree**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Stage and propose the final commit**

```bash
git add ARCHITECTURE.md TASKS.md
```

```
Document Figma design-alignment pass and remaining Phase 5 follow-ups

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```
