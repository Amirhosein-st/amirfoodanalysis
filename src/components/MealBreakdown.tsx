import { getMealTypesForCount } from "@/lib/mealTypes";
import { useTranslation } from "react-i18next";

interface MealCalories {
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
}

interface MealBreakdownProps {
  mealCalories: MealCalories;
  mealsPerDay: number;
}

const MealBreakdown = ({ mealCalories, mealsPerDay }: MealBreakdownProps) => {
  const mealConfig = getMealTypesForCount(mealsPerDay);
  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("tracker.caloriesByMeal")}</h3>
      <div className={`grid gap-2 ${mealConfig.length === 2 ? 'grid-cols-2' : mealConfig.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {mealConfig.map(({ key, icon: Icon, color }) => (
          <div
            key={key}
            className="bg-secondary/50 rounded-xl p-3 text-center"
          >
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <p className="text-lg font-semibold text-foreground">
              {mealCalories[key as keyof MealCalories]}
            </p>
            <p className="text-xs text-muted-foreground">{t(`meals.${key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealBreakdown;
