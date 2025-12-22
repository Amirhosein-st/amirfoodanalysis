import { Coffee, Sun, Moon, Cookie } from "lucide-react";

export interface MealTypeConfig {
  key: string;
  label: string;
  icon: typeof Coffee;
  color: string;
}

export const allMealTypes: MealTypeConfig[] = [
  { key: "breakfast", label: "Breakfast", icon: Coffee, color: "text-accent" },
  { key: "lunch", label: "Lunch", icon: Sun, color: "text-primary" },
  { key: "dinner", label: "Dinner", icon: Moon, color: "text-primary" },
  { key: "snack", label: "Snack", icon: Cookie, color: "text-muted-foreground" },
];

export const getMealTypesForCount = (mealsPerDay: number | null): MealTypeConfig[] => {
  switch (mealsPerDay) {
    case 2:
      return allMealTypes.filter(m => ["breakfast", "dinner"].includes(m.key));
    case 3:
      return allMealTypes.filter(m => ["breakfast", "lunch", "dinner"].includes(m.key));
    case 4:
    default:
      return allMealTypes;
  }
};

export const getMealTypeKeys = (mealsPerDay: number | null): string[] => {
  return getMealTypesForCount(mealsPerDay).map(m => m.key);
};

export const getMealTypeLabels = (mealsPerDay: number | null): string[] => {
  return getMealTypesForCount(mealsPerDay).map(m => m.label);
};
