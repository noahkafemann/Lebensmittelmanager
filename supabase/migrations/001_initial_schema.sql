create extension if not exists pgcrypto;

create type public.household_role as enum ('admin', 'member');
create type public.unit_type as enum ('g', 'kg', 'ml', 'l', 'stück', 'tl', 'el');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role public.household_role not null default 'member',
  created_at timestamptz not null default now(),
  unique(household_id, user_id)
);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  role public.household_role not null default 'member',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  unit public.unit_type not null,
  storage_location text not null,
  best_before_date date,
  use_by_date date,
  purchase_date date,
  note text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text not null default '',
  servings integer not null check (servings > 0),
  prep_minutes integer not null check (prep_minutes > 0),
  category text not null,
  image_url text,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  unit public.unit_type not null,
  optional boolean not null default false
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  instruction text not null,
  unique(recipe_id, step_order)
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  unit public.unit_type not null,
  category text not null,
  note text,
  is_checked boolean not null default false,
  is_purchased boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pantry_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid references public.recipes(id),
  executed_by uuid not null references auth.users(id),
  target_servings numeric(8,2) not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

create index on public.household_members(user_id);
create index on public.pantry_items(household_id, name);
create index on public.recipes(household_id, updated_at desc);
create index on public.shopping_items(household_id, updated_at desc);

create or replace function public.current_household_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1;
$$;

create or replace function public.is_household_admin(p_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.create_household_with_admin(p_household_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  insert into public.households(name)
  values (trim(p_household_name))
  returning id into v_household_id;

  insert into public.household_members(household_id, user_id, email, role)
  values (
    v_household_id,
    auth.uid(),
    coalesce((auth.jwt()->>'email'), ''),
    'admin'
  );

  return v_household_id;
end;
$$;

create or replace function public.create_household_invite(
  p_email text,
  p_role public.household_role
)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  v_household_id := public.current_household_id();

  if v_household_id is null then
    raise exception 'Kein Haushalt gefunden';
  end if;

  if not public.is_household_admin(v_household_id) then
    raise exception 'Nur Admins können Einladungen erstellen';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires_at := now() + interval '7 days';

  insert into public.household_invites(household_id, email, role, token, expires_at, created_by)
  values (v_household_id, lower(trim(p_email)), p_role, v_token, v_expires_at, auth.uid());

  return query select v_token, v_expires_at;
end;
$$;

create or replace function public.accept_household_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  v_email := lower(coalesce((auth.jwt()->>'email'), ''));

  select *
  into v_invite
  from public.household_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'Ungültige oder abgelaufene Einladung';
  end if;

  if v_email = '' or v_email <> lower(v_invite.email) then
    raise exception 'Einladung passt nicht zum angemeldeten Konto';
  end if;

  insert into public.household_members(household_id, user_id, email, role)
  values (v_invite.household_id, auth.uid(), v_email, v_invite.role)
  on conflict (household_id, user_id) do nothing;

  update public.household_invites
  set accepted_at = now()
  where id = v_invite.id;
end;
$$;

create or replace function public.complete_cooking(
  p_recipe_id uuid,
  p_target_servings numeric,
  p_consumption jsonb,
  p_missing_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_row jsonb;
  v_current_quantity numeric;
  v_name text;
  v_qty numeric;
  v_unit public.unit_type;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  v_household_id := public.current_household_id();

  if v_household_id is null then
    raise exception 'Kein Haushalt';
  end if;

  if not exists(select 1 from public.recipes r where r.id = p_recipe_id and r.household_id = v_household_id) then
    raise exception 'Rezept nicht im Haushalt';
  end if;

  for v_row in select * from jsonb_array_elements(p_consumption)
  loop
    select quantity into v_current_quantity
    from public.pantry_items
    where id = (v_row->>'pantry_item_id')::uuid
      and household_id = v_household_id
      and archived_at is null
    for update;

    if v_current_quantity is null then
      raise exception 'Pantry-Eintrag nicht gefunden';
    end if;

    if v_current_quantity < (v_row->>'quantity')::numeric then
      raise exception 'Nicht genug Bestand für %', (v_row->>'pantry_item_id');
    end if;

    update public.pantry_items
    set quantity = quantity - (v_row->>'quantity')::numeric,
        archived_at = case when quantity - (v_row->>'quantity')::numeric <= 0 then now() else null end
    where id = (v_row->>'pantry_item_id')::uuid;
  end loop;

  for v_row in select * from jsonb_array_elements(p_missing_items)
  loop
    v_name := trim(v_row->>'name');
    v_qty := (v_row->>'quantity')::numeric;
    v_unit := (v_row->>'unit')::public.unit_type;

    if v_qty <= 0 then
      continue;
    end if;

    update public.shopping_items
    set quantity = quantity + v_qty,
        updated_at = now()
    where household_id = v_household_id
      and lower(name) = lower(v_name)
      and unit = v_unit
      and is_checked = false;

    if not found then
      insert into public.shopping_items(
        household_id, name, quantity, unit, category, note, is_checked, is_purchased
      ) values (
        v_household_id,
        v_name,
        v_qty,
        v_unit,
        'Rezept',
        'Automatisch aus Kochmodus ergänzt',
        false,
        false
      );
    end if;
  end loop;

  insert into public.pantry_transactions(household_id, recipe_id, executed_by, target_servings, details)
  values (v_household_id, p_recipe_id, auth.uid(), p_target_servings, jsonb_build_object('consumption', p_consumption, 'missing', p_missing_items));
end;
$$;

create or replace function public.purchase_item_to_pantry(
  p_shopping_item_id uuid,
  p_quantity numeric,
  p_unit public.unit_type,
  p_best_before_date date,
  p_purchase_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_item public.shopping_items;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  v_household_id := public.current_household_id();

  select * into v_item
  from public.shopping_items
  where id = p_shopping_item_id
    and household_id = v_household_id
  for update;

  if not found then
    raise exception 'Shopping Item nicht gefunden';
  end if;

  insert into public.pantry_items(
    household_id, name, category, quantity, unit, storage_location, best_before_date, purchase_date, note
  ) values (
    v_household_id,
    v_item.name,
    v_item.category,
    p_quantity,
    p_unit,
    'Vorratsschrank',
    p_best_before_date,
    coalesce(p_purchase_date, current_date),
    coalesce(v_item.note, 'Aus Einkaufsliste übernommen')
  );

  update public.shopping_items
  set is_checked = true,
      is_purchased = true,
      updated_at = now()
  where id = p_shopping_item_id;
end;
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.pantry_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.shopping_items enable row level security;
alter table public.pantry_transactions enable row level security;

create policy "households_select_member" on public.households
for select using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = households.id and hm.user_id = auth.uid()
  )
);

create policy "households_insert_none" on public.households
for insert with check (false);

create policy "households_update_admin" on public.households
for update using (public.is_household_admin(id))
with check (public.is_household_admin(id));

create policy "household_members_select_own_household" on public.household_members
for select using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = household_members.household_id
      and hm.user_id = auth.uid()
  )
);

create policy "household_members_insert_admin_only" on public.household_members
for insert with check (
  public.is_household_admin(household_id)
  and user_id = auth.uid()
);

create policy "household_members_update_admin_only" on public.household_members
for update using (public.is_household_admin(household_id))
with check (
  public.is_household_admin(household_id)
  and role in ('admin', 'member')
);

create policy "household_members_delete_admin_only" on public.household_members
for delete using (public.is_household_admin(household_id));

create policy "household_invites_select_admin_only" on public.household_invites
for select using (public.is_household_admin(household_id));

create policy "household_invites_insert_admin_only" on public.household_invites
for insert with check (public.is_household_admin(household_id));

create policy "household_invites_update_admin_only" on public.household_invites
for update using (public.is_household_admin(household_id))
with check (public.is_household_admin(household_id));

create policy "pantry_crud_member" on public.pantry_items
for all using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = pantry_items.household_id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = pantry_items.household_id
      and hm.user_id = auth.uid()
  )
);

create policy "recipes_crud_member" on public.recipes
for all using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = recipes.household_id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = recipes.household_id
      and hm.user_id = auth.uid()
  )
);

create policy "recipe_ingredients_crud_member" on public.recipe_ingredients
for all using (
  exists (
    select 1
    from public.recipes r
    join public.household_members hm on hm.household_id = r.household_id
    where r.id = recipe_ingredients.recipe_id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    join public.household_members hm on hm.household_id = r.household_id
    where r.id = recipe_ingredients.recipe_id
      and hm.user_id = auth.uid()
  )
);

create policy "recipe_steps_crud_member" on public.recipe_steps
for all using (
  exists (
    select 1
    from public.recipes r
    join public.household_members hm on hm.household_id = r.household_id
    where r.id = recipe_steps.recipe_id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    join public.household_members hm on hm.household_id = r.household_id
    where r.id = recipe_steps.recipe_id
      and hm.user_id = auth.uid()
  )
);

create policy "shopping_crud_member" on public.shopping_items
for all using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = shopping_items.household_id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = shopping_items.household_id
      and hm.user_id = auth.uid()
  )
);

create policy "pantry_transactions_select_member" on public.pantry_transactions
for select using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = pantry_transactions.household_id
      and hm.user_id = auth.uid()
  )
);

create policy "pantry_transactions_insert_member" on public.pantry_transactions
for insert with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = pantry_transactions.household_id
      and hm.user_id = auth.uid()
  )
);

create or replace function public.set_household_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.household_id is null then
    new.household_id := public.current_household_id();
  end if;
  return new;
end;
$$;

create trigger trg_set_household_id_pantry
before insert on public.pantry_items
for each row execute function public.set_household_id();

create trigger trg_set_household_id_recipes
before insert on public.recipes
for each row execute function public.set_household_id();

create trigger trg_set_household_id_shopping
before insert on public.shopping_items
for each row execute function public.set_household_id();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_recipes
before update on public.recipes
for each row execute function public.touch_updated_at();

create trigger trg_touch_shopping
before update on public.shopping_items
for each row execute function public.touch_updated_at();
