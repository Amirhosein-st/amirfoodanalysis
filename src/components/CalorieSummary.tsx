import { Flame, Drumstick, Wheat, Droplets } from "lucide-react";

interface CalorieSummaryProps {
  totalCalories: number;
  goalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const CalorieSummary = ({
  totalCalories,
  goalCalories,
  protein,
  carbs,
  fat,
}: CalorieSummaryProps) => {
  const progress = Math.min((totalCalories / goalCalories) * 100, 100);
  const remaining = Math.max(goalCalories - totalCalories, 0);

  return (
    <div className="bg-card rounded-2xl shadow-elevated p-6 animate-slide-up">
      {/* Main Calorie Ring */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.64} 264`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="w-5 h-5 text-accent mb-1" />
            <span className="text-2xl font-bold text-foreground">{totalCalories}</span>
            <span className="text-xs text-muted-foreground">kcal</span>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">Daily Progress</h3>
          <p className="text-muted-foreground text-sm mb-3">
            {remaining > 0
              ? `${remaining} kcal remaining`
              : `${Math.abs(goalCalories - totalCalories)} kcal over goal`}
          </p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Goal: {goalCalories} kcal
          </p>
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <Drumstick className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-lg font-semibold text-foreground">{protein.toFixed(0)}g</p>
          <p className="text-xs text-muted-foreground">Protein</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <Wheat className="w-5 h-5 text-accent mx-auto mb-2" />
          <p className="text-lg font-semibold text-foreground">{carbs.toFixed(0)}g</p>
          <p className="text-xs text-muted-foreground">Carbs</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <Droplets className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-lg font-semibold text-foreground">{fat.toFixed(0)}g</p>
          <p className="text-xs text-muted-foreground">Fat</p>
        </div>
      </div>
    </div>
  );
};

export default CalorieSummary;
