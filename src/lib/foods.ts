import type { DietPref, Food, FoodRole, MealSlot } from './types'

/**
 * Food composition table. Values are per 100 g (per 100 ml for drinks) of the
 * food as eaten — cooked, where the food is normally cooked. Based on USDA
 * FoodData Central and IFCT 2017 for the subcontinental staples. Rounded.
 *
 * Every entry is tagged `vegan`, `vegetarian` (adds dairy and egg) or
 * `non-veg`, so the planner can serve a plant-only, lacto-ovo or unrestricted
 * diet from the same engine.
 */
type Row = [
  id: string,
  name: string,
  diet: DietPref,
  role: FoodRole,
  meals: MealSlot[],
  servingLabel: string,
  servingGrams: number,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  tags?: string[],
]

const VEG: DietPref = 'vegan'
const LACTO: DietPref = 'vegetarian'
const MEAT: DietPref = 'non-veg'

const rows: Row[] = [
  // ── Plant proteins ────────────────────────────────────────────────────────
  ['tofu', 'Firm tofu', VEG, 'protein', ['breakfast', 'lunch', 'dinner'], '150 g block', 150, 144, 17.3, 2.8, 8.7, 2.3, ['soy', 'high-protein']],
  ['tempeh', 'Tempeh', VEG, 'protein', ['breakfast', 'lunch', 'dinner'], '100 g', 100, 195, 20.3, 7.6, 11.4, 6.4, ['soy', 'high-protein', 'fermented']],
  ['soy-yogurt', 'Soy yogurt, plain', VEG, 'protein', ['breakfast', 'snack'], '170 g pot', 170, 60, 6, 4.2, 2.5, 0.6, ['plant-based', 'probiotic']],
  ['besan-chilla', 'Besan chilla', VEG, 'protein', ['breakfast'], '2 chillas', 120, 190, 9, 22, 7.4, 4.2, ['indian', 'chickpea']],
  ['hemp-seeds', 'Hemp seeds', VEG, 'nut', ['breakfast', 'snack'], '3 tbsp', 30, 553, 31.6, 8.7, 48.8, 4, ['omega-3', 'complete-protein']],
  ['edamame', 'Edamame, shelled', VEG, 'protein', ['lunch', 'snack'], '1 cup', 155, 121, 11.9, 8.9, 5.2, 5.2, ['soy']],
  ['seitan', 'Seitan', VEG, 'protein', ['lunch', 'dinner'], '100 g', 100, 141, 25, 14, 2, 1, ['gluten', 'high-protein']],
  ['lentils', 'Lentils, cooked', VEG, 'legume', ['lunch', 'dinner'], '1 cup', 198, 116, 9, 20.1, 0.4, 7.9, ['dal', 'budget']],
  ['chickpeas', 'Chickpeas, cooked', VEG, 'legume', ['lunch', 'dinner', 'snack'], '1 cup', 164, 164, 8.9, 27.4, 2.6, 7.6, ['chana']],
  ['kidney-beans', 'Kidney beans, cooked', VEG, 'legume', ['lunch', 'dinner'], '1 cup', 177, 127, 8.7, 22.8, 0.5, 6.4, ['rajma']],
  ['black-beans', 'Black beans, cooked', VEG, 'legume', ['lunch', 'dinner'], '1 cup', 172, 132, 8.9, 23.7, 0.5, 8.7],
  ['green-peas', 'Green peas, cooked', VEG, 'vegetable', ['lunch', 'dinner'], '1 cup', 160, 84, 5.4, 15.6, 0.2, 5.5],
  ['soy-chunks', 'Soya chunks, cooked', VEG, 'protein', ['lunch', 'dinner'], '1 cup', 100, 145, 22, 12, 1, 6, ['soy', 'high-protein', 'budget']],
  ['hummus', 'Hummus', VEG, 'legume', ['snack', 'lunch'], '1/4 cup', 60, 166, 7.9, 14.3, 9.6, 6],
  ['peanut-butter', 'Peanut butter', VEG, 'nut', ['breakfast', 'snack'], '1 tbsp', 16, 588, 25, 20, 50, 6, ['spread']],
  ['nutritional-yeast', 'Nutritional yeast', VEG, 'protein', ['lunch', 'dinner', 'breakfast'], '2 tbsp', 10, 385, 45, 35, 5, 20, ['b12']],

  // ── Dairy & egg ───────────────────────────────────────────────────────────
  ['egg', 'Whole egg', LACTO, 'protein', ['breakfast', 'lunch', 'dinner'], '1 large', 50, 143, 12.6, 0.7, 9.5, 0, ['quick']],
  ['egg-white', 'Egg whites', LACTO, 'protein', ['breakfast', 'snack'], '3 whites', 100, 52, 10.9, 0.7, 0.2, 0, ['high-protein', 'low-fat']],
  ['whey', 'Whey protein isolate', LACTO, 'protein', ['snack', 'breakfast', 'evening'], '1 scoop', 30, 373, 80, 8, 1.5, 1, ['supplement', 'high-protein', 'quick']],
  ['greek-yogurt-0', 'Greek yogurt, non-fat', LACTO, 'dairy', ['breakfast', 'snack'], '170 g pot', 170, 59, 10.2, 3.6, 0.4, 0, ['high-protein']],
  ['greek-yogurt', 'Greek yogurt, whole', LACTO, 'dairy', ['breakfast', 'snack'], '170 g pot', 170, 97, 9, 3.9, 5, 0],
  ['curd', 'Curd / plain yogurt', LACTO, 'dairy', ['lunch', 'dinner', 'snack'], '1 cup', 245, 61, 3.5, 4.7, 3.3, 0, ['dahi']],
  ['paneer', 'Paneer', LACTO, 'protein', ['lunch', 'dinner', 'breakfast'], '100 g', 100, 265, 18.3, 1.2, 20.8, 0, ['high-protein']],
  ['cottage-cheese', 'Cottage cheese, 2%', LACTO, 'protein', ['breakfast', 'snack'], '1/2 cup', 113, 84, 11, 4.3, 2.3, 0, ['high-protein']],
  ['milk-whole', 'Whole milk', LACTO, 'dairy', ['breakfast', 'snack', 'evening'], '1 glass', 240, 61, 3.2, 4.8, 3.3, 0],
  ['milk-skim', 'Skim milk', LACTO, 'dairy', ['breakfast', 'snack', 'evening'], '1 glass', 240, 34, 3.4, 5, 0.1, 0],
  ['cheddar', 'Cheddar cheese', LACTO, 'dairy', ['snack', 'lunch'], '30 g slice', 30, 403, 24.9, 1.3, 33.1, 0],
  ['mozzarella', 'Mozzarella, part-skim', LACTO, 'dairy', ['lunch', 'dinner'], '30 g', 30, 254, 24.3, 2.8, 15.9, 0],
  ['feta', 'Feta cheese', LACTO, 'dairy', ['lunch'], '30 g', 30, 264, 14.2, 4.1, 21.3, 0],
  ['kefir', 'Kefir', LACTO, 'dairy', ['breakfast', 'snack'], '1 glass', 240, 41, 3.3, 4.5, 1, 0, ['probiotic']],
  ['butter', 'Butter', LACTO, 'fat', ['breakfast'], '1 tsp', 5, 717, 0.9, 0.1, 81.1, 0],
  ['ghee', 'Ghee', LACTO, 'fat', ['lunch', 'dinner', 'breakfast'], '1 tsp', 5, 900, 0, 0, 100, 0],
  ['honey', 'Honey', LACTO, 'carb', ['breakfast', 'snack'], '1 tsp', 7, 304, 0.3, 82.4, 0, 0.2, ['sweetener']],

  // ── Meat, fish, seafood ───────────────────────────────────────────────────
  ['chicken-breast', 'Chicken breast, skinless', MEAT, 'protein', ['lunch', 'dinner'], '150 g', 150, 165, 31, 0, 3.6, 0, ['high-protein', 'lean']],
  ['chicken-thigh', 'Chicken thigh, skinless', MEAT, 'protein', ['lunch', 'dinner'], '120 g', 120, 209, 26, 0, 10.9, 0],
  ['turkey', 'Turkey breast', MEAT, 'protein', ['lunch', 'dinner'], '150 g', 150, 135, 30, 0, 1, 0, ['lean', 'high-protein']],
  ['salmon', 'Salmon fillet', MEAT, 'protein', ['lunch', 'dinner'], '150 g', 150, 208, 20.4, 0, 13.4, 0, ['omega-3']],
  ['tuna', 'Tuna, canned in water', MEAT, 'protein', ['lunch', 'snack'], '1 tin', 100, 116, 25.5, 0, 0.8, 0, ['quick', 'high-protein', 'lean']],
  ['sardines', 'Sardines, canned', MEAT, 'protein', ['lunch', 'snack'], '1 tin', 90, 208, 24.6, 0, 11.5, 0, ['omega-3', 'calcium']],
  ['mackerel', 'Mackerel', MEAT, 'protein', ['lunch', 'dinner'], '130 g', 130, 262, 23.8, 0, 17.8, 0, ['omega-3']],
  ['shrimp', 'Shrimp, cooked', MEAT, 'protein', ['lunch', 'dinner'], '150 g', 150, 99, 24, 0.2, 0.3, 0, ['lean', 'high-protein']],
  ['cod', 'Cod / white fish', MEAT, 'protein', ['lunch', 'dinner'], '150 g', 150, 105, 22.8, 0, 0.9, 0, ['lean', 'high-protein']],
  ['beef-mince', 'Beef mince, 90% lean', MEAT, 'protein', ['lunch', 'dinner'], '150 g', 150, 176, 26, 0, 7.5, 0, ['iron']],
  ['steak', 'Sirloin steak', MEAT, 'protein', ['dinner', 'lunch'], '180 g', 180, 206, 29, 0, 9, 0, ['iron', 'b12']],
  ['pork', 'Pork tenderloin', MEAT, 'protein', ['lunch', 'dinner'], '150 g', 150, 143, 26, 0, 3.5, 0, ['lean']],
  ['lamb', 'Lamb, lean', MEAT, 'protein', ['dinner', 'lunch'], '130 g', 130, 258, 25, 0, 17, 0, ['iron']],
  ['bacon', 'Bacon', MEAT, 'protein', ['breakfast'], '2 rashers', 30, 541, 37, 1.4, 42, 0],
  ['ham', 'Deli ham', MEAT, 'protein', ['breakfast', 'lunch'], '3 slices', 60, 145, 18, 1.5, 7, 0],

  // ── Grains & starches ─────────────────────────────────────────────────────
  ['oats', 'Rolled oats, dry', VEG, 'carb', ['breakfast'], '1/2 cup', 40, 389, 16.9, 66.3, 6.9, 10.6, ['beta-glucan']],
  ['brown-rice', 'Brown rice, cooked', VEG, 'carb', ['lunch', 'dinner'], '1 cup', 195, 123, 2.7, 25.6, 1, 1.6],
  ['white-rice', 'White rice, cooked', VEG, 'carb', ['lunch', 'dinner'], '1 cup', 158, 130, 2.7, 28.2, 0.3, 0.4],
  ['quinoa', 'Quinoa, cooked', VEG, 'carb', ['lunch', 'dinner', 'breakfast'], '1 cup', 185, 120, 4.4, 21.3, 1.9, 2.8, ['complete-protein']],
  ['roti', 'Whole-wheat roti', VEG, 'carb', ['lunch', 'dinner', 'breakfast'], '1 roti', 40, 300, 9.4, 48, 7, 7, ['chapati']],
  ['bread-ww', 'Whole-wheat bread', VEG, 'carb', ['breakfast', 'snack'], '2 slices', 72, 247, 13, 41, 3.4, 7],
  ['pasta-ww', 'Whole-wheat pasta, cooked', VEG, 'carb', ['lunch', 'dinner'], '1 cup', 140, 124, 5.3, 26.5, 0.5, 3.9],
  ['sweet-potato', 'Sweet potato, baked', VEG, 'carb', ['lunch', 'dinner', 'snack'], '1 medium', 150, 90, 2, 20.7, 0.2, 3.3, ['vitamin-a']],
  ['potato', 'Potato, boiled', VEG, 'carb', ['lunch', 'dinner', 'breakfast'], '1 medium', 150, 87, 2, 20.1, 0.1, 1.8],
  ['poha', 'Poha (flattened rice), cooked', VEG, 'carb', ['breakfast', 'snack'], '1 cup', 160, 130, 2.6, 27, 2.2, 1.5, ['indian']],
  ['upma', 'Rava upma, cooked', VEG, 'carb', ['breakfast'], '1 cup', 180, 145, 3.5, 22, 4.5, 2, ['indian']],
  ['idli', 'Idli, steamed', VEG, 'carb', ['breakfast', 'snack'], '2 idli', 90, 130, 4, 26, 0.5, 1.5, ['indian', 'fermented']],
  ['dosa', 'Plain dosa', VEG, 'carb', ['breakfast', 'dinner'], '1 dosa', 85, 168, 4.5, 28, 3.7, 1.6, ['indian']],
  ['corn-tortilla', 'Corn tortilla', VEG, 'carb', ['lunch', 'dinner'], '2 tortillas', 60, 218, 5.7, 45, 2.9, 6.3],
  ['rice-cakes', 'Rice cakes', VEG, 'carb', ['snack'], '2 cakes', 18, 390, 8, 81, 3, 4, ['low-cal']],
  ['popcorn', 'Popcorn, air-popped', VEG, 'carb', ['snack'], '3 cups', 24, 387, 12.9, 77.8, 4.5, 14.5, ['high-volume']],
  ['date', 'Medjool dates', VEG, 'carb', ['snack', 'breakfast'], '2 dates', 48, 277, 1.8, 75, 0.2, 6.7, ['quick-energy']],

  // ── Fats, nuts & seeds ────────────────────────────────────────────────────
  ['olive-oil', 'Olive oil', VEG, 'fat', ['lunch', 'dinner'], '1 tbsp', 14, 884, 0, 0, 100, 0],
  ['coconut-oil', 'Coconut oil', VEG, 'fat', ['breakfast', 'lunch'], '1 tsp', 5, 892, 0, 0, 99, 0],
  ['avocado', 'Avocado', VEG, 'fat', ['breakfast', 'lunch', 'snack'], '1/2 fruit', 100, 160, 2, 8.5, 14.7, 6.7, ['potassium']],
  ['almonds', 'Almonds', VEG, 'nut', ['snack', 'breakfast'], 'handful', 28, 579, 21.2, 21.6, 49.9, 12.5, ['vitamin-e']],
  ['walnuts', 'Walnuts', VEG, 'nut', ['snack', 'breakfast'], 'handful', 28, 654, 15.2, 13.7, 65.2, 6.7, ['omega-3']],
  ['cashews', 'Cashews', VEG, 'nut', ['snack'], 'handful', 28, 553, 18.2, 30.2, 43.9, 3.3],
  ['chia', 'Chia seeds', VEG, 'nut', ['breakfast', 'snack'], '1 tbsp', 12, 486, 16.5, 42.1, 30.7, 34.4, ['omega-3']],
  ['flax', 'Flaxseed, ground', VEG, 'nut', ['breakfast'], '1 tbsp', 10, 534, 18.3, 28.9, 42.2, 27.3, ['omega-3', 'lignans']],
  ['pumpkin-seeds', 'Pumpkin seeds', VEG, 'nut', ['snack', 'breakfast'], '2 tbsp', 20, 559, 30.2, 10.7, 49, 6, ['zinc', 'magnesium']],
  ['sesame', 'Sesame seeds', VEG, 'nut', ['lunch', 'breakfast'], '1 tbsp', 9, 573, 17.7, 23.4, 49.7, 11.8, ['calcium']],

  // ── Vegetables ────────────────────────────────────────────────────────────
  ['spinach', 'Spinach, cooked', VEG, 'vegetable', ['lunch', 'dinner', 'breakfast'], '1 cup', 180, 23, 2.9, 3.6, 0.4, 2.2, ['iron', 'folate']],
  ['broccoli', 'Broccoli, cooked', VEG, 'vegetable', ['lunch', 'dinner'], '1 cup', 156, 35, 2.4, 7.2, 0.4, 3.3, ['vitamin-c']],
  ['salad-greens', 'Mixed salad greens', VEG, 'vegetable', ['lunch', 'dinner'], '2 cups', 80, 17, 1.4, 2.9, 0.2, 1.5, ['low-cal']],
  ['tomato', 'Tomato', VEG, 'vegetable', ['lunch', 'dinner', 'breakfast'], '1 medium', 120, 18, 0.9, 3.9, 0.2, 1.2, ['lycopene']],
  ['cucumber', 'Cucumber', VEG, 'vegetable', ['lunch', 'snack'], '1 cup', 120, 15, 0.7, 3.6, 0.1, 0.5, ['hydrating']],
  ['carrot', 'Carrot', VEG, 'vegetable', ['lunch', 'snack'], '1 medium', 60, 41, 0.9, 9.6, 0.2, 2.8],
  ['bell-pepper', 'Bell pepper', VEG, 'vegetable', ['lunch', 'dinner'], '1 medium', 120, 31, 1, 6, 0.3, 2.1, ['vitamin-c']],
  ['cauliflower', 'Cauliflower', VEG, 'vegetable', ['lunch', 'dinner'], '1 cup', 107, 25, 1.9, 5, 0.3, 2, ['low-carb']],
  ['green-beans', 'Green beans', VEG, 'vegetable', ['lunch', 'dinner'], '1 cup', 125, 31, 1.8, 7, 0.2, 3.4],
  ['zucchini', 'Zucchini', VEG, 'vegetable', ['lunch', 'dinner'], '1 cup', 120, 17, 1.2, 3.1, 0.3, 1, ['low-carb']],
  ['mushroom', 'Mushrooms', VEG, 'vegetable', ['breakfast', 'lunch', 'dinner'], '1 cup', 156, 22, 3.1, 3.3, 0.3, 1],
  ['onion', 'Onion', VEG, 'vegetable', ['lunch', 'dinner'], '1 medium', 110, 40, 1.1, 9.3, 0.1, 1.7],
  ['beetroot', 'Beetroot', VEG, 'vegetable', ['lunch', 'dinner'], '1 cup', 136, 43, 1.6, 9.6, 0.2, 2.8, ['nitrates']],

  // ── Fruit ─────────────────────────────────────────────────────────────────
  ['banana', 'Banana', VEG, 'fruit', ['breakfast', 'snack', 'evening'], '1 medium', 118, 89, 1.1, 22.8, 0.3, 2.6, ['potassium', 'pre-workout']],
  ['apple', 'Apple', VEG, 'fruit', ['snack', 'breakfast'], '1 medium', 182, 52, 0.3, 13.8, 0.2, 2.4],
  ['orange', 'Orange', VEG, 'fruit', ['snack', 'breakfast'], '1 medium', 131, 47, 0.9, 11.8, 0.1, 2.4, ['vitamin-c']],
  ['blueberries', 'Blueberries', VEG, 'fruit', ['breakfast', 'snack'], '1 cup', 148, 57, 0.7, 14.5, 0.3, 2.4, ['antioxidants']],
  ['strawberries', 'Strawberries', VEG, 'fruit', ['breakfast', 'snack'], '1 cup', 144, 32, 0.7, 7.7, 0.3, 2, ['low-cal']],
  ['mango', 'Mango', VEG, 'fruit', ['snack', 'breakfast'], '1 cup', 165, 60, 0.8, 15, 0.4, 1.6],
  ['papaya', 'Papaya', VEG, 'fruit', ['breakfast', 'snack'], '1 cup', 145, 43, 0.5, 10.8, 0.3, 1.7, ['digestive']],
  ['pineapple', 'Pineapple', VEG, 'fruit', ['snack'], '1 cup', 165, 50, 0.5, 13.1, 0.1, 1.4],
  ['grapes', 'Grapes', VEG, 'fruit', ['snack'], '1 cup', 151, 69, 0.7, 18.1, 0.2, 0.9],
  ['watermelon', 'Watermelon', VEG, 'fruit', ['snack'], '2 cups', 300, 30, 0.6, 7.6, 0.2, 0.4, ['hydrating']],
  ['guava', 'Guava', VEG, 'fruit', ['snack', 'breakfast'], '1 fruit', 100, 68, 2.6, 14.3, 1, 5.4, ['vitamin-c']],

  // ── Drinks & extras ───────────────────────────────────────────────────────
  ['soy-milk', 'Soy milk, unsweetened', VEG, 'beverage', ['breakfast', 'snack'], '1 glass', 240, 33, 2.9, 0.7, 1.8, 0.5, ['fortified']],
  ['black-coffee', 'Black coffee', VEG, 'beverage', ['breakfast', 'evening'], '1 cup', 240, 2, 0.3, 0, 0, 0, ['zero-cal']],
  ['green-tea', 'Green tea', VEG, 'beverage', ['snack', 'evening'], '1 cup', 240, 1, 0, 0.2, 0, 0, ['zero-cal']],
  ['protein-bar', 'Protein bar', LACTO, 'protein', ['snack', 'evening'], '1 bar', 60, 350, 30, 35, 10, 6, ['convenience']],
  ['dark-chocolate', 'Dark chocolate, 85%', VEG, 'carb', ['snack', 'evening'], '2 squares', 20, 598, 7.8, 45.9, 42.6, 10.9, ['magnesium']],
  ['olives', 'Olives', VEG, 'fat', ['snack', 'lunch'], '10 olives', 35, 145, 1, 3.8, 15.3, 3.2],
  ['pickle', 'Pickle / achar', VEG, 'vegetable', ['lunch', 'dinner'], '1 tbsp', 15, 60, 0.9, 6, 3.5, 1.5, ['indian']],
  ['chutney', 'Tamarind chutney', VEG, 'vegetable', ['snack', 'breakfast'], '1 tbsp', 15, 130, 1, 30, 0.5, 1.5, ['indian']],
  ['sambar', 'Sambar', VEG, 'legume', ['breakfast', 'lunch', 'dinner'], '1 cup', 240, 55, 2.9, 7.8, 1.6, 2.4, ['indian']],
  ['veg-curry', 'Mixed vegetable curry', VEG, 'vegetable', ['lunch', 'dinner'], '1 cup', 240, 92, 2.6, 9.5, 5.2, 3.2, ['indian']],
  ['dal-tadka', 'Dal tadka', VEG, 'legume', ['lunch', 'dinner'], '1 cup', 240, 105, 6, 14, 3.4, 4.5, ['indian']],
  ['chicken-curry', 'Chicken curry', MEAT, 'protein', ['lunch', 'dinner'], '1 cup', 240, 148, 14, 4, 8.2, 0.8, ['indian']],
  ['fish-curry', 'Fish curry', MEAT, 'protein', ['lunch', 'dinner'], '1 cup', 240, 132, 15, 4, 6, 0.6, ['indian', 'omega-3']],
  ['tandoori-chicken', 'Tandoori chicken', MEAT, 'protein', ['dinner', 'lunch'], '2 pieces', 150, 165, 26, 2, 6, 0, ['indian']],
]

export const FOODS: Food[] = rows.map((r) => ({
  id: r[0],
  name: r[1],
  diet: r[2],
  role: r[3],
  meals: r[4],
  serving: { label: r[5], grams: r[6] },
  per100: { kcal: r[7], protein: r[8], carbs: r[9], fat: r[10], fiber: r[11] },
  tags: r[12] ?? [],
}))

const byId = new Map(FOODS.map((f) => [f.id, f]))

export function getFood(id: string): Food | undefined {
  return byId.get(id)
}

/** Nutrition density used to rank "best" protein sources: protein per 100 kcal. */
export function proteinDensity(food: Food): number {
  if (food.per100.kcal <= 0) return 0
  return (food.per100.protein / food.per100.kcal) * 100
}
