create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('insert','update','delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_log_table_row on public.audit_log(table_name, row_id);
alter table public.audit_log enable row level security;

create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_row_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
    v_new := null;
  elsif TG_OP = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(NEW);
  else
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  end if;

  v_row_id := nullif(coalesce(v_new->>'id', v_old->>'id'), '')::uuid;

  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), TG_TABLE_NAME, v_row_id, lower(TG_OP), v_old, v_new);

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories','sizes','tiers','size_tiers','cakes','cake_images',
    'flavors','colors','shapes','toppers','topper_colors',
    'cake_flavors','cake_colors','cake_toppers',
    'orders','order_items','order_item_flavors',
    'promo_codes','delivery_areas','delivery_calendar_blocks',
    'expense_categories','expenses','profiles'
  ]
  loop
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.fn_audit_log();',
      t
    );
  end loop;
end $$;
