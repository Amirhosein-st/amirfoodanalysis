import { Coffee, Sun, Moon, Cookie } from "lucide-react";

interface MealCalories {
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
}

interface MealBreakdownProps {
  mealCalories: MealCalories;
}

const mealConfig = [
  { key: "breakfast", label: "Breakfast", icon: Coffee, color: "text-accent" },
  { key: "lunch", label: "Lunch", icon: Sun, color: "text-primary" },
  { key: "dinner", label: "Dinner", icon: Moon, color: "text-primary" },
  { key: "snack", label: "Snack", icon: Cookie, color: "text-muted-foreground" },
] as const;

const MealBreakdown = ({ mealCalories }: MealBreakdownProps) => {
  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Calories by Meal</h3>
      <div className="grid grid-cols-4 gap-2">
        {mealConfig.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="bg-secondary/50 rounded-xl p-3 text-center"
          >
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <p className="text-lg font-semibold text-foreground">
              {mealCalories[key]}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealBreakdown;
