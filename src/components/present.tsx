import { Apple, Coffee, Moon, Utensils, UtensilsCrossed } from 'lucide-react'
import type { Food, FoodRole, MealSlot } from '../lib/types'

export const ROLE_EMOJI: Record<FoodRole, string> = {
  protein: '🥩',
  legume: '🫘',
  dairy: '🥛',
  carb: '🍚',
  vegetable: '🥦',
  fruit: '🍎',
  nut: '🥜',
  fat: '🫒',
  beverage: '🥤',
}

/** A handful of foods deserve a more accurate icon than their category. */
const EMOJI_OVERRIDES: Record<string, string> = {
  egg: '🥚',
  'egg-white': '🥚',
  tofu: '🧊',
  tempeh: '🟫',
  seitan: '🌾',
  'soy-chunks': '🌱',
  whey: '🥤',
  'greek-yogurt-0': '🥣',
  'greek-yogurt': '🥣',
  curd: '🥣',
  paneer: '🧈',
  'cottage-cheese': '🧀',
  cheddar: '🧀',
  mozzarella: '🧀',
  feta: '🧀',
  butter: '🧈',
  ghee: '🧈',
  milk: '🥛',
  'milk-whole': '🥛',
  'milk-skim': '🥛',
  kefir: '🥛',
  oats: '🥣',
  quinoa: '🌾',
  roti: '🫓',
  'bread-ww': '🍞',
  'pasta-ww': '🍝',
  idli: '⚪',
  dosa: '🥞',
  poha: '🍚',
  upma: '🥣',
  'brown-rice': '🍚',
  'white-rice': '🍚',
  'sweet-potato': '🍠',
  potato: '🥔',
  'corn-tortilla': '🌮',
  'rice-cakes': '⚪',
  popcorn: '🍿',
  date: '🌴',
  banana: '🍌',
  apple: '🍎',
  orange: '🍊',
  blueberries: '🫐',
  strawberries: '🍓',
  mango: '🥭',
  papaya: '🍈',
  pineapple: '🍍',
  grapes: '🍇',
  watermelon: '🍉',
  guava: '🍐',
  avocado: '🥑',
  almonds: '🌰',
  walnuts: '🌰',
  cashews: '🌰',
  'pumpkin-seeds': '🎃',
  'peanut-butter': '🥜',
  hummus: '🧆',
  edamame: '🫛',
  'green-peas': '🫛',
  'olive-oil': '🫒',
  'coconut-oil': '🥥',
  olives: '🫒',
  spinach: '🥬',
  broccoli: '🥦',
  'salad-greens': '🥬',
  tomato: '🍅',
  cucumber: '🥒',
  carrot: '🥕',
  'bell-pepper': '🫑',
  cauliflower: '🥦',
  'green-beans': '🫛',
  zucchini: '🥒',
  mushroom: '🍄',
  onion: '🧅',
  beetroot: '🍠',
  honey: '🍯',
  'dark-chocolate': '🍫',
  'black-coffee': '☕',
  'green-tea': '🍵',
  'soy-milk': '🥛',
  'protein-bar': '🍫',
  'nutritional-yeast': '🟡',
  sambar: '🥣',
  'dal-tadka': '🥣',
  'veg-curry': '🍛',
  'chicken-curry': '🍛',
  'fish-curry': '🍛',
  'tandoori-chicken': '🍗',
  'chicken-breast': '🍗',
  'chicken-thigh': '🍗',
  turkey: '🦃',
  salmon: '🐟',
  tuna: '🐟',
  sardines: '🐟',
  mackerel: '🐟',
  shrimp: '🦐',
  cod: '🐟',
  'beef-mince': '🥩',
  steak: '🥩',
  pork: '🥓',
  lamb: '🍖',
  bacon: '🥓',
  ham: '🍖',
  pickle: '🥒',
  chutney: '🥫',
}

export function emojiFor(food: Food): string {
  return EMOJI_OVERRIDES[food.id] ?? ROLE_EMOJI[food.role]
}

export function MealIcon({ slot, size = 16 }: { slot: MealSlot; size?: number }) {
  if (slot === 'breakfast') return <Coffee size={size} />
  if (slot === 'lunch') return <Utensils size={size} />
  if (slot === 'dinner') return <UtensilsCrossed size={size} />
  if (slot === 'evening') return <Moon size={size} />
  return <Apple size={size} />
}

export function DietDot({ diet }: { diet: Food['diet'] }) {
  const color = diet === 'vegan' ? 'var(--kcal)' : diet === 'vegetarian' ? 'var(--carbs)' : 'var(--danger)'
  const label = diet === 'vegan' ? 'Vegan' : diet === 'vegetarian' ? 'Vegetarian' : 'Non-veg'
  return (
    <span className="inline" style={{ gap: 5 }}>
      <i className="macro-dot" style={{ background: color }} />
      <span className="tiny faint">{label}</span>
    </span>
  )
}
