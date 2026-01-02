import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Utensils, Clock, Flame, Check, ListChecks, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import IntroductionModal from "@/components/IntroductionModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { routes } from "@/lib/routes";

interface MealOption {
  name: string;
  calories: number;
  description?: string;
  foods: string[];
}

interface Meal {
  name: string;
  time: string;
  targetCalories?: number;
  options?: MealOption[];
  // Legacy support for old format
  calories?: number;
  description?: string;
  foods?: string[];
  foods_1?: string[];
  foods_2?: string[];
  foods_3?: string[];
  foods1?: string[];
  foods2?: string[];
  foods3?: string[];
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
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Normalize meals to always have options array
  const normalizedMeals = useMemo(() => {
    if (!diet?.meals) return [];
    
    return diet.meals.map(meal => {
      // If meal already has options array (new AI format), use it
      if (meal.options && Array.isArray(meal.options) && meal.options.length > 0) {
        return {
          ...meal,
          options: meal.options
        };
      }

      // Handle foods_1, foods_2, foods_3 format
      if (meal.foods_1 && meal.foods_2 && meal.foods_3) {
        return {
          ...meal,
          options: [
            {
              name: "Option 1",
              calories: meal.calories || 0,
              description: meal.description || "",
              foods: meal.foods_1
            },
            {
              name: "Option 2",
              calories: meal.calories || 0,
              description: meal.description || "",
              foods: meal.foods_2
            },
            {
              name: "Option 3",
              calories: meal.calories || 0,
              description: meal.description || "",
              foods: meal.foods_3
            }
          ]
        };
      }

      // Handle foods1, foods2, foods3 format (without underscore)
      if (meal.foods1 && meal.foods2 && meal.foods3) {
        return {
          ...meal,
          options: [
            {
              name: "Option 1",
              calories: meal.calories || 0,
              description: meal.description || "",
              foods: meal.foods1
            },
            {
              name: "Option 2",
              calories: meal.calories || 0,
              description: meal.description || "",
              foods: meal.foods2
            },
            {
              name: "Option 3",
              calories: meal.calories || 0,
              description: meal.description || "",
              foods: meal.foods3
            }
          ]
        };
      }
      
      // If legacy format (single foods array), create one option
      const legacyFoods = meal.foods || [];
      return {
        ...meal,
        options: [{
          name: "Standard Option",
          calories: meal.calories || 0,
          description: meal.description || "No description available",
          foods: legacyFoods
        }]
      };
    });
  }, [diet]);

  // Initialize selected options (default to first option or load from localStorage)
  useEffect(() => {
    if (normalizedMeals.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const storageKey = `selectedMeals_${today}`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        try {
          const savedMeals = JSON.parse(saved);
          // Try to match saved meals with current meals and restore selections
          const restoredSelections: Record<number, number> = {};
          normalizedMeals.forEach((meal, index) => {
            const savedMeal = savedMeals.find((m: any) => m.name === meal.name && m.time === meal.time);
            if (savedMeal && meal.options) {
              // Find the option that matches the saved meal
              const optionIndex = meal.options.findIndex(opt => 
                opt.calories === savedMeal.calories && 
                JSON.stringify(opt.foods) === JSON.stringify(savedMeal.foods)
              );
              restoredSelections[index] = optionIndex >= 0 ? optionIndex : 0;
            } else {
              restoredSelections[index] = 0;
            }
          });
          setSelectedOptions(restoredSelections);
          return;
        } catch (e) {
          console.error("Error loading saved selections:", e);
        }
      }
      
      // Default to first option if no saved data
      const initialSelections: Record<number, number> = {};
      normalizedMeals.forEach((_, index) => {
        initialSelections[index] = 0;
      });
      setSelectedOptions(initialSelections);
    }
  }, [normalizedMeals]);

  const handleOptionSelect = (mealIndex: number, optionIndex: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      [mealIndex]: optionIndex
    }));
    
    // Save to localStorage immediately when selection changes
    const newSelections = {
      ...selectedOptions,
      [mealIndex]: optionIndex
    };
    saveSelectedMealsToLocalStorage(newSelections);
  };

  const saveSelectedMealsToLocalStorage = (selections: Record<number, number>) => {
    if (!diet || !normalizedMeals.length) return;
    
    const today = new Date().toISOString().split("T")[0];
    const selectedMeals = normalizedMeals.map((meal, index) => {
      const optionIndex = selections[index] ?? 0;
      const selectedOption = meal.options?.[optionIndex];
      
      if (!selectedOption) {
        return {
          name: meal.name,
          time: meal.time,
          calories: 0,
          description: "",
          foods: []
        };
      }

      return {
        name: meal.name,
        time: meal.time,
        calories: selectedOption.calories,
        description: selectedOption.description || "",
        foods: selectedOption.foods
      };
    });

    const storageKey = `selectedMeals_${today}`;
    localStorage.setItem(storageKey, JSON.stringify(selectedMeals));
  };

  const handleSaveDietPlan = async () => {
    if (!diet) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save a diet plan.",
          variant: "destructive",
        });
        return;
      }

      // Create the flattened meal plan based on selections
      const selectedMeals = normalizedMeals.map((meal, index) => {
        const optionIndex = selectedOptions[index] || 0;
        const selectedOption = meal.options?.[optionIndex];
        
        if (!selectedOption) {
          return {
            name: meal.name,
            time: meal.time,
            calories: 0,
            description: "",
            foods: []
          };
        }

        return {
          name: meal.name,
          time: meal.time,
          calories: selectedOption.calories,
          description: selectedOption.description || "",
          foods: selectedOption.foods
        };
      });

      // Also save to localStorage
      const today = new Date().toISOString().split("T")[0];
      const storageKey = `selectedMeals_${today}`;
      localStorage.setItem(storageKey, JSON.stringify(selectedMeals));

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
          meals: JSON.parse(JSON.stringify(selectedMeals)),
          tips: JSON.parse(JSON.stringify(diet.tips)),
        }]);

      if (error) throw error;

      toast({
        title: "Diet Plan Saved",
        description: "Your diet plan has been saved successfully.",
      });
      
      navigate(routes.tracker, { state: { fromDietPlan: true } });
    } catch (error) {
      console.error("Error saving diet plan:", error);
      toast({
        title: "Error",
        description: "Failed to save diet plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!diet) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No diet plan available</p>
        <Button onClick={() => navigate(routes.home)}>Go Back</Button>
      </div>
    );
  }

  const introSteps = [
    {
      icon: <Utensils className="w-8 h-8 text-primary" />,
      title: "Multiple Meal Options",
      description: "For each meal, we've prepared 3 different options. Choose the one that fits your preferences and availability.",
    },
    {
      icon: <ListChecks className="w-8 h-8 text-primary" />,
      title: "Select Your Preferences",
      description: "Review all meals and select your preferred option for each. You can see the calories and ingredients for every choice.",
    },
    {
      icon: <Sparkles className="w-8 h-8 text-primary" />,
      title: "Save & Start Tracking",
      description: "Once you've chosen your meals, save the plan and start tracking your daily food intake to reach your goals.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <IntroductionModal
        storageKey="diet-intro-seen"
        title="Your Personalized Diet Plan 🎯"
        description="Here's how to customize your diet plan"
        steps={introSteps}
      />
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-10 w-full">
        <div className="max-w-[1400px] mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(routes.home)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Your Diet Plan</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="px-4 pb-32 pt-4 space-y-6 w-full max-w-[1400px]">
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

          <div className="bg-secondary/30 p-4 rounded-lg border border-border">
            <p className="text-sm text-center text-muted-foreground">
              Review the meal options below. Select your preferred option for each meal, then click "Save & Start Tracking" at the bottom.
            </p>
          </div>

          {/* Meals */}
          <div className="space-y-8">
            {normalizedMeals.map((meal, mealIndex) => (
              <div key={mealIndex} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{meal.name}</h2>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Recommended time: {meal.time}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {meal.options?.map((option, optionIndex) => {
                    const isSelected = selectedOptions[mealIndex] === optionIndex;
                    
                    return (
                      <Card 
                        key={optionIndex} 
                        className={`cursor-pointer transition-all hover:border-primary/50 relative overflow-hidden ${
                          isSelected ? "border-primary ring-1 ring-primary shadow-lg bg-primary/5" : "border-border"
                        }`}
                        onClick={() => handleOptionSelect(mealIndex, optionIndex)}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 p-2 bg-primary text-primary-foreground rounded-bl-lg">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex justify-between items-start gap-2">
                            <span className={isSelected ? "text-primary font-semibold" : "text-foreground"}>{option.name}</span>
                          </CardTitle>
                          <div className={`text-sm font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                            {option.calories} kcal
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className={`text-sm mb-3 min-h-[40px] ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {option.description || "No description available"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {option.foods?.map((food, foodIndex) => (
                              <span
                                key={foodIndex}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  isSelected 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {food}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
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
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border z-20">
        <div className="w-full max-w-[1400px] mx-auto flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 h-[48px]"
            onClick={() => navigate(routes.home)}
          >
            Cancel
          </Button>
          <Button 
            className="flex-[2] h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-medium shadow-lg shadow-primary/20" 
            onClick={handleSaveDietPlan}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save & Start Tracking"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Diet;
