// The pantry and the menu: four ingredients, two ways to prepare them, and four
// recipes that combine them in different ways. An ingredient is raw until it has
// been through its station; only a prepared ingredient can go on a plate.

export const STATION_BOARD = 'board';
export const STATION_STOVE = 'stove';

export const INGREDIENTS = {
  noodle: { id: 'noodle', name: 'Noodle', color: '#f2c94c', dark: '#c9a227', station: STATION_STOVE, seconds: 2.6 },
  egg: { id: 'egg', name: 'Egg', color: '#fff3d6', dark: '#e8c96a', station: STATION_STOVE, seconds: 2.2 },
  tomato: { id: 'tomato', name: 'Tomato', color: '#e5534b', dark: '#b2342c', station: STATION_BOARD, seconds: 1.8 },
  chili: { id: 'chili', name: 'Chili', color: '#d9382b', dark: '#8f1f16', station: STATION_BOARD, seconds: 1.5 },
};

export const INGREDIENT_LIST = ['noodle', 'egg', 'tomato', 'chili'];

/** Seconds past "done" a pan item survives before it burns. Chopping never burns. */
export const BURN_GRACE = 4;

export const RECIPES = [
  { id: 'golden-noodle', name: 'Golden Noodle', needs: ['noodle', 'tomato'], points: 100 },
  { id: 'sunny-plate', name: 'Sunny Plate', needs: ['egg', 'tomato'], points: 100 },
  { id: 'spicy-noodle', name: 'Spicy Noodle', needs: ['noodle', 'chili'], points: 120 },
  { id: 'sunrise-special', name: 'Sunrise Special', needs: ['egg', 'noodle', 'chili'], points: 180 },
];

export function recipeById(id) {
  for (const recipe of RECIPES) if (recipe.id === id) return recipe;
  return null;
}

/** A carried item: which ingredient, whether it has been through its station. */
export function makeItem(ingredientId) {
  return { ingredient: ingredientId, prepared: false, burnt: false };
}

export function itemName(item) {
  const base = INGREDIENTS[item.ingredient].name;
  if (item.burnt) return `Burnt ${base}`;
  return item.prepared ? base : `Raw ${base}`;
}

/** Do `plate` (an array of ingredient ids) hold exactly the recipe's needs? */
export function plateMatches(plate, recipe) {
  if (plate.length !== recipe.needs.length) return false;
  const sortedPlate = [...plate].sort();
  const sortedNeeds = [...recipe.needs].sort();
  for (let i = 0; i < sortedPlate.length; i += 1) {
    if (sortedPlate[i] !== sortedNeeds[i]) return false;
  }
  return true;
}

/** The recipe a plate completes, or null when it matches nothing yet. */
export function recipeForPlate(plate) {
  for (const recipe of RECIPES) if (plateMatches(plate, recipe)) return recipe;
  return null;
}

/** Could this plate still become some recipe (no wrong ingredient on it)? */
export function plateStillPossible(plate) {
  for (const recipe of RECIPES) {
    const rest = [...recipe.needs];
    let ok = true;
    for (const ingredient of plate) {
      const at = rest.indexOf(ingredient);
      if (at === -1) { ok = false; break; }
      rest.splice(at, 1);
    }
    if (ok) return true;
  }
  return false;
}
