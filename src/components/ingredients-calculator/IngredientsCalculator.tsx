import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/card/Card";

type UnitType = "mass" | "volume";

interface Unit {
  id: string;
  label: string;
  type: UnitType;
  toBase: (val: number) => number; // to grams (mass) or cups (volume)
  fromBase: (val: number) => number; // from grams (mass) or cups (volume)
}

const UNITS: Unit[] = [
  {
    id: "grams",
    label: "Grams",
    type: "mass",
    toBase: (val) => val,
    fromBase: (val) => val,
  },
  {
    id: "cups",
    label: "Cups",
    type: "volume",
    toBase: (val) => val,
    fromBase: (val) => val,
  },
  {
    id: "oz",
    label: "Ounces",
    type: "mass",
    toBase: (val) => val * 28.3495,
    fromBase: (val) => val / 28.3495,
  },
  {
    id: "ml",
    label: "Millilitres",
    type: "volume",
    toBase: (val) => val / 240,
    fromBase: (val) => val * 240,
  },
];

const INGREDIENTS = [
  { label: "Water", value: 240 },
  {
    label: "Sugars & Sweeteners",
    options: [
      { label: "Caster Sugar", value: 202 },
      { label: "Granulated Sugar", value: 215 },
      { label: "Icing/Powdered Sugar", value: 146 },
      { label: "Brown Sugar (Packed)", value: 203 },
      { label: "Maple Syrup", value: 303 },
      { label: "Runny Honey", value: 325 },
      { label: "Golden Syrup", value: 321 },
      { label: "Black Treacle", value: 340 },
    ],
  },
  {
    label: "Flour",
    options: [
      { label: "Self-Raising Flour", value: 161 },
      { label: "Plain/All-purpose Flour", value: 161 },
      { label: "Spelt Flour", value: 161 },
      { label: "Wholemeal Flour", value: 155 },
      { label: "Cornflour", value: 122 },
    ],
  },
  {
    label: "Fats and Oils",
    options: [
      { label: "Butter", value: 222 },
      { label: "Margarine", value: 222 },
      { label: "Vegetable Oil", value: 214 },
    ],
  },
  {
    label: "Nuts & Seeds",
    options: [
      { label: "Ground Almonds", value: 94 },
      { label: "Chia Seeds", value: 170 },
      { label: "Linseeds/Flax Seeds", value: 161 },
    ],
  },
  {
    label: "Milk & Cream",
    options: [
      { label: "Milk", value: 255 },
      { label: "Single Cream", value: 255 },
      { label: "Double Cream", value: 255 },
      { label: "Heavy Cream", value: 255 },
      { label: "Whipping Cream", value: 255 },
      { label: "Half-and-half", value: 255 },
      { label: "Buttermilk", value: 272 },
    ],
  },
  {
    label: "Other Ingredients",
    options: [
      { label: "Cocoa Powder", value: 111 },
      { label: "Chocolate Chips", value: 181 },
      { label: "Mini Marshmallows", value: 49 },
      { label: "Popping Corn", value: 221 },
      { label: "Raisins", value: 147 },
      { label: "Cream Cheese", value: 229 },
      { label: "Desiccated Coconut", value: 70 },
      { label: "Pudding Rice", value: 210 },
      { label: "Nutella", value: 295 },
      { label: "Custard", value: 274 },
      { label: "Skimmed Milk Powder", value: 266 },
    ],
  },
];

export const IngredientsCalculator = () => {
  const [ingredientValue, setIngredientValue] = useState<number>(-1);
  const [amount, setAmount] = useState<string>("");
  const [fromUnitId, setFromUnitId] = useState<string>("grams");
  const [toUnitId, setToUnitId] = useState<string>("cups");

  const result = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return "";

    const fromUnit = UNITS.find((u) => u.id === fromUnitId);
    const toUnit = UNITS.find((u) => u.id === toUnitId);

    if (!fromUnit || !toUnit) return "";

    // If same type, just convert
    if (fromUnit.type === toUnit.type) {
        const base = fromUnit.toBase(val);
        const result = toUnit.fromBase(base);
        return result.toFixed(2).replace(/\.00$/, "");
    }

    // If different type, we need density (ingredientValue)
    // density is Grams per Cup.
    if (ingredientValue === -1) return "Select Ingredient";

    let grams = 0;
    // Convert input to Grams
    if (fromUnit.type === "mass") {
      grams = fromUnit.toBase(val);
    } else {
      // Volume to Mass
      const cups = fromUnit.toBase(val);
      grams = cups * ingredientValue;
    }

    // Convert Grams to output
    let outVal = 0;
    if (toUnit.type === "mass") {
      outVal = toUnit.fromBase(grams);
    } else {
      // Mass to Volume
      const cups = grams / ingredientValue;
      outVal = toUnit.fromBase(cups);
    }

    return outVal.toFixed(2).replace(/\.00$/, "");

  }, [amount, fromUnitId, toUnitId, ingredientValue]);

  return (
    <Card className="w-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-300 dark:border-neutral-800 backdrop-blur px-0 py-0 shadow overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/80 backdrop-blur">
        <h2 className="font-semibold text-base">Ingredients Calculator</h2>
      </div>
      <div className="p-4 flex flex-col gap-4 flex-1">
        <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Ingredient
            </label>
            <select
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/60 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                value={ingredientValue}
                onChange={(e) => setIngredientValue(Number(e.target.value))}
            >
                <option value="-1">- Select Ingredient -</option>
                {INGREDIENTS.map((group, i) => {
                    if ('options' in group) {
                        return (
                            <optgroup key={i} label={group.label}>
                                {group.options.map((opt) => (
                                    <option key={opt.label} value={opt.value}>{opt.label}</option>
                                ))}
                            </optgroup>
                        )
                    } else {
                        return (
                            <option key={group.label} value={group.value}>{group.label}</option>
                        )
                    }
                })}
            </select>
        </div>

        <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-end">
                 <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Amount
                    </label>
                    <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/60 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                 </div>
                 <div className="w-1/3 min-w-[100px]">
                    <select
                        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/60 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                        value={fromUnitId}
                        onChange={(e) => setFromUnitId(e.target.value)}
                    >
                        {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                 </div>
            </div>

            <div className="flex gap-2 items-end">
                 <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Result
                    </label>
                    <div className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 h-[38px] flex items-center">
                        {result || "-"}
                    </div>
                 </div>
                 <div className="w-1/3 min-w-[100px]">
                    <select
                        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/60 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                        value={toUnitId}
                        onChange={(e) => setToUnitId(e.target.value)}
                    >
                        {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                 </div>
            </div>
        </div>
      </div>
    </Card>
  );
};

