import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Utensils } from "lucide-react";
import { z } from "zod";

const foodSchema = z.object({
  food_name: z.string().min(1, "Food name is required"),
  calories: z.number().min(0, "Calories must be positive"),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  meal_type: z.string(),
});

interface AddFoodDialogProps {
  onFoodAdded: () => void;
}

const AddFoodDialog = ({ onFoodAdded }: AddFoodDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState("snack");
  const { toast } = useToast();

  const resetForm = () => {
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setMealType("snack");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const foodData = {
        food_name: foodName,
        calories: parseInt(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        meal_type: mealType,
        user_id: user.id,
      };

      foodSchema.parse(foodData);

      const { error } = await supabase.from("food_entries").insert(foodData);

      if (error) throw error;

      toast({
        title: "Food added!",
        description: `${foodName} has been logged.`,
      });

      resetForm();
      setOpen(false);
      onFoodAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add food",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Add Food
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Add Food Entry
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="foodName">Food Name</Label>
            <Input
              id="foodName"
              placeholder="e.g., Grilled Chicken Salad"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mealType">Meal Type</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Food Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFoodDialog;
