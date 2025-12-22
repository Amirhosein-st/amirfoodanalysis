import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Utensils, Clock, Flame, Save } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Meal {
  name: string;
  time: string;
  calories: number;
  description: string;
  foods: string[];
}

interface DietPlan {
  totalCalories: number;
  meals: Meal[];
  tips: string[];
}

const Diet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const diet = location.state?.diet as DietPlan | undefined;
  const { toast } = useToast();

  // Auto-save diet plan when loaded
  useEffect(() => {
    const saveDietPlan = async () => {
      if (!diet) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete existing diet plan and insert new one
      await supabase
        .from("saved_diet_plans")
        .delete()
        .eq("user_id", user.id);

      const { error } = await supabase
        .from("saved_diet_plans")
        .insert([{
          user_id: user.id,
          total_calories: diet.totalCalories,
          meals: JSON.parse(JSON.stringify(diet.meals)),
          tips: JSON.parse(JSON.stringify(diet.tips)),
        }]);

      if (error) {
        console.error("Error saving diet plan:", error);
      } else {
        toast({
          title: "Diet Plan Saved",
          description: "Your diet plan has been saved and will be used for meal tracking.",
        });
      }
    };

    saveDietPlan();
  }, [diet]);

  if (!diet) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No diet plan available</p>
        <Button onClick={() => navigate("/")}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Your Diet Plan</h1>
        </div>
        <ThemeToggle />
      </header>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <main className="px-4 pb-8 space-y-6">
          {/* Total Calories Card */}
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="w-6 h-6 text-primary" />
                <span className="text-4xl font-bold text-foreground">
                  {diet.totalCalories}
                </span>
              </div>
              <p className="text-muted-foreground">Daily Calories Target</p>
            </CardContent>
          </Card>

          {/* Meals */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Daily Meals</h2>
            {diet.meals.map((meal, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Utensils className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{meal.name}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Best time to eat: {meal.time}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">{meal.calories}</span>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">{meal.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {meal.foods.map((food, foodIndex) => (
                      <span
                        key={foodIndex}
                        className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tips */}
          {diet.tips && diet.tips.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Tips for Success</h2>
              <Card>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {diet.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => navigate("/tracker")}
          >
            Start Tracking Your Meals
          </Button>
        </main>
      </ScrollArea>
    </div>
  );
};

export default Diet;
