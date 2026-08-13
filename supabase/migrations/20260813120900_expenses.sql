create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  active boolean not null default true
);
alter table public.expense_categories enable row level security;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories(id),
  amount numeric(10,2) not null,
  expense_date date not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index idx_expenses_category_id on public.expenses(category_id);
create index idx_expenses_expense_date on public.expenses(expense_date);
alter table public.expenses enable row level security;
