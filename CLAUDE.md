# CLAUDE.md

This file is auto-read by Claude Code at the start of every session in this repo. Follow it without needing to be reminded.

## Project

Cake ordering website + business analytics dashboard for a real, already-operating cake business (previously WhatsApp-only) based in Cairo, Egypt. Bilingual (English default / Arabic toggle, RTL support required). No online payment — orders are placed, then priced/confirmed by the business over WhatsApp/phone.

Full spec lives in `ARCHITECTURE.md`. Phase breakdown and current progress live in `TASKS.md`.

## Tech stack

- Next.js (App Router) + TypeScript — storefront, admin dashboard, and API (Route Handlers / Server Actions) all in one codebase
- Supabase (Postgres + Auth + Row-Level Security)
- Cloudinary — image storage
- Resend — transactional email (account confirmation only, nothing else for now)
- Tailwind CSS + shadcn/ui
- next-intl — EN/AR toggle
- Zustand — cart state
- exceljs — analytics export
- Deploy: Vercel (app) + Supabase (DB/Auth, hosted)

## Hard rules

1. **Never commit automatically.** Stage changes and stop. The human reviews the diff and commits manually. At the end of every response where changes were staged, propose a commit message (in a fenced code block, ready to copy) so the human can review and commit it themselves.
2. **Never open a browser or run a dev server to self-test.** The human tests manually. Don't spend tokens on this.
3. **Before writing any code**, read `ARCHITECTURE.md` and the relevant section of `TASKS.md`.
4. **After finishing a task**, update `TASKS.md` (check it off, note anything that changed) and update `ARCHITECTURE.md` if an architectural decision was made or changed along the way.
5. **Before starting a non-trivial new feature** (a new phase, a new major flow), run a `/grilling` session (grill-me skill) to pressure-test the plan before implementing. Skip this for small, well-defined edits.
6. **Every UI surface must support EN/AR + RTL** — don't hardcode English-only strings or LTR-only layout assumptions, even in early scaffolding.
7. **All money fields are EGP.** No currency conversion, no other currencies.
8. **Don't introduce new dependencies, services, or architectural patterns without flagging it** — if something in `ARCHITECTURE.md` seems wrong or insufficient mid-task, stop and ask rather than silently deciding differently.
9. Keep changes scoped to the current task in `TASKS.md`. Don't opportunistically refactor unrelated code.

## When stuck or ambiguous

Ask a specific question rather than guessing silently on anything that affects data model, security (auth/RLS), or money/pricing logic. Guessing is fine for naming, minor styling, or internal code structure.
