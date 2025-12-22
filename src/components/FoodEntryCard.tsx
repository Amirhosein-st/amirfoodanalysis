import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Coffee, Sun, Moon, Cookie } from "lucide-react";

interface FoodEntry {
  id: string;
  food_name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  meal_type: string | null;
  created_at: string;
}

interface FoodEntryCardProps {
  entry: FoodEntry;
  onDelete: () => void;
}

const mealIcons: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="w-4 h-4" />,
  lunch: <Sun className="w-4 h-4" />,
  dinner: <Moon className="w-4 h-4" />,
  snack: <Cookie className="w-4 h-4" />,
};

const mealColors: Record<string, string> = {
  breakfast: "bg-accent/10 text-accent",
  lunch: "bg-primary/10 text-primary",
  dinner: "bg-primary/20 text-primary",
  snack: "bg-secondary text-secondary-foreground",
};

const FoodEntryCard = ({ entry, onDelete }: FoodEntryCardProps) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("food_entries").delete().eq("id", entry.id);
      if (error) throw error;
      toast({
        title: "Entry deleted",
        description: `${entry.food_name} has been removed.`,
      });
      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const mealType = entry.meal_type || "snack";

  return (
    <div className="bg-card rounded-xl shadow-soft p-4 flex items-center gap-4 animate-scale-in hover:shadow-elevated transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mealColors[mealType]}`}>
        {mealIcons[mealType]}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">{entry.food_name}</h4>
        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
          {entry.protein !== null && <span>P: {entry.protein}g</span>}
          {entry.carbs !== null && <span>C: {entry.carbs}g</span>}
          {entry.fat !== null && <span>F: {entry.fat}g</span>}
        </div>
      </div>

      <div className="text-right">
        <p className="font-semibold text-foreground">{entry.calories}</p>
        <p className="text-xs text-muted-foreground">kcal</p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default FoodEntryCard;
