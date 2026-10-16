# Vitalis — fitness, health & macro tracker with a diet planner

A single-page app that tracks calories, macros, weight and water, and builds a
day-by-day diet plan around the user's goal — with a **vegetarian** and a
**non-vegetarian** category (plus vegan, for a plant-only diet).

No backend and no account: everything lives in `localStorage` on the device.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # typecheck + production bundle into dist/
npm run check      # typecheck, food-table integrity, planner accuracy, store, and view-render checks
```

`npm run dev` binds `0.0.0.0:3000`. To serve behind a proxy or preview tunnel,
allow its hostname at runtime without committing it:

```bash
PREVIEW_HOST=my-preview.example.com npm run dev
```

## What it does

| Area | Detail |
| --- | --- |
| **Onboarding** | Six steps: goal → pace → body stats → activity → diet category & meals per day → calculated targets. |
| **Today** | Energy ring (consumed vs target), macro bars, water tracker, streak, weight logging, 7-day energy chart, next-meal card. |
| **Diary** | Per-meal logging for any date, food search with portion control, quick ±10 g adjustments, "log today's plan", clear day. |
| **Meal plans** | A 7-day planner with Vegetarian / Non-vegetarian / Vegan categories, per-meal shuffle, macro-fit score, one-click logging and a grouped shopping list. |
| **Progress** | Weight trend with a goal line, 14-day energy chart with target line, average macro adherence, consistency stats. |
| **Profile** | Live recalculation of all targets, metric/imperial units, JSON backup/restore and reset. |

## How the numbers are derived

**Energy.** BMR from the Mifflin-St Jeor equation, multiplied by an activity
factor (1.2–1.9) to get TDEE. The goal then applies a fraction of TDEE:
−12/−20/−25 % for fat loss, +8/+14/+20 % for muscle gain, with a safety floor of
1500 kcal (male) / 1200 kcal (female).

**Macros.** Protein is set per kilogram of body weight — 2.0 g/kg in a deficit
(protects lean mass), 1.8 g/kg in a surplus, 1.6 g/kg at maintenance — and
capped at 40 % of energy. Fat is 27 % of energy with a 0.6 g/kg hormonal floor.
Carbohydrate takes the remainder. Fibre is 14 g per 1000 kcal, water 35 ml/kg.

**Meal plan.** Each meal is built from a role recipe (protein + carb + vegetable
/ fruit + fat), where foods are filtered by diet and by meal slot. Portions are
then *solved*, not guessed: a coordinate-descent pass sets each portion to the
value that best matches the meal's energy, protein, carbohydrate and fat
targets, with a light pull toward natural serving sizes. Larger meals get an
extra calorie lever, and a final 5 g-granularity hill-climb removes the drift
introduced by rounding.

Measured over 324 generated plans (3 diets × 3 goals × 3 meal counts × 12
seeds), the solver lands within 5 % of the energy target 324/324 times, and
within 10 % of the protein target 312/324 times — with zero diet violations.
Reproduce with `npm run check:planner`.

Stated energy in the food table is the published measured value, not
derived from the macros: the 4/4/9 factors overestimate high-fibre vegetables by
up to 30 % and underestimate animal protein by a few percent, so `data-check`
only flags a macro figure that is implausibly low for its stated energy.

## Diet categories

`dietAllows()` enforces the hierarchy:

- **Vegan** — plant foods only.
- **Vegetarian** — adds dairy and egg; still no meat or fish.
- **Non-vegetarian** — everything.

Every food in the table is tagged, so the dairy, egg, meat and fish pools are
strictly separated by the planner and the checker.

## Project layout

```
src/
  lib/
    types.ts      domain types
    nutrition.ts  BMR/TDEE, macro targets, units, BMI
    foods.ts      ~130-item composition table, each tagged vegan/vegetarian/non-veg
    planner.ts    meal recipes, portion solver, shopping list
    store.ts      localStorage store, actions, selectors
    dates.ts      local-date helpers
  components/     views and UI primitives
scripts/
    data-check.ts     food-table integrity (ids, mass balance, per-diet coverage)
    planner-check.ts  324-plan accuracy sweep and diet compliance
    store-check.ts    persistence round-trip and selectors
    ssr-smoke.tsx     renders every view to catch render-time crashes
```

## Disclaimer

General nutrition information, not medical advice. Energy needs are estimates —
adjust using how your weight responds over 2–3 weeks. Consult a clinician if you
are pregnant, breastfeeding, managing a chronic condition, or under 18.
