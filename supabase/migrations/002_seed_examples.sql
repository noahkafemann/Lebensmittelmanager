create or replace function public.seed_example_recipes_for_current_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_recipe_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  v_household_id := public.current_household_id();

  if v_household_id is null then
    raise exception 'Kein Haushalt';
  end if;

  if exists (
    select 1
    from public.recipes
    where household_id = v_household_id
      and title like '[Beispiel] %'
  ) then
    return;
  end if;

  insert into public.recipes(
    household_id, title, description, servings, prep_minutes, category, tags, is_favorite
  ) values (
    v_household_id,
    '[Beispiel] Pasta Tomate',
    'Einfaches Familienrezept zum Starten.',
    3,
    25,
    'Abendessen',
    array['beispiel', 'familie'],
    true
  ) returning id into v_recipe_id;

  insert into public.recipe_ingredients(recipe_id, name, quantity, unit, optional)
  values
    (v_recipe_id, 'Nudeln', 500, 'g', false),
    (v_recipe_id, 'Passierte Tomaten', 700, 'ml', false),
    (v_recipe_id, 'Olivenöl', 2, 'el', false),
    (v_recipe_id, 'Salz', 1, 'tl', true);

  insert into public.recipe_steps(recipe_id, step_order, instruction)
  values
    (v_recipe_id, 1, 'Nudeln in Salzwasser kochen.'),
    (v_recipe_id, 2, 'Tomatensauce mit Öl aufkochen und würzen.'),
    (v_recipe_id, 3, 'Nudeln mit Sauce mischen und servieren.');
end;
$$;
