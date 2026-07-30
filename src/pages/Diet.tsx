import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Utensils, Clock, Flame, Check, ListChecks, Sparkles, RefreshCw, BookOpen, ChefHat, Loader2 } from "lucide-react";
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

interface Recipe {
  name: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  ingredients: Array<{ item: string; amount: string }>;
  steps: string[];
  notes?: string[];
}

const Diet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const diet = location.state?.diet as DietPlan | undefined;
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [refreshingMeal, setRefreshingMeal] = useState<number | null>(null);
  const [mealOverrides, setMealOverrides] = useState<Record<number, Meal>>({});
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeFoodName, setRecipeFoodName] = useState("");

  // Normalize meals to always have options array
  const normalizedMeals = useMemo(() => {
    if (!diet?.meals) return [];
    
    return diet.meals.map((originalMeal, mealIndex) => {
      const meal = mealOverrides[mealIndex] || originalMeal;
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
  }, [diet, mealOverrides]);

  const handleRefreshMeal = async (mealIndex: number) => {
    const meal = normalizedMeals[mealIndex];
    if (!meal || refreshingMeal !== null) return;

    setRefreshingMeal(mealIndex);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { data: healthProfile, error: healthError } = await supabase
        .from("user_health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (healthError || !healthProfile) throw new Error("Health profile not found");

      const excludedOptions = normalizedMeals.flatMap((currentMeal) =>
        (currentMeal.options || []).map((option) => ({
          optionName: option.name,
          foods: option.foods,
        }))
      );
      const excludedFoodNames = excludedOptions.flatMap((option) => [
        option.optionName,
        ...option.foods,
      ]);

      // Keep using the existing full-diet endpoint. These request-only preferences
      // become part of its current AI prompt without changing the saved profile.
      const refreshProfile = {
        ...healthProfile,
        liked_foods: [
          ...(healthProfile.liked_foods || []),
          `Generate a fresh set of choices for ${meal.name}; vary the main ingredient and cooking method.`,
        ],
        disliked_foods: [
          ...(healthProfile.disliked_foods || []),
          ...excludedFoodNames.map((food) => `Do not repeat for this generation: ${food}`),
        ],
      };

      const { data, error } = await supabase.functions.invoke("generate-diet", {
        body: {
          healthProfile: refreshProfile,
        },
      });

      if (error) throw error;

      const refreshedMeal = data?.meal
        || data?.diet?.meals?.find(
          (candidate: Meal) => candidate.name.toLowerCase() === meal.name.toLowerCase()
        )
        || data?.diet?.meals?.[mealIndex];

      if (!refreshedMeal) {
        throw new Error("AI did not return the requested meal");
      }

      const refreshedOptions = Array.isArray(refreshedMeal.options)
        ? refreshedMeal.options
        : refreshedMeal.foods_1 && refreshedMeal.foods_2 && refreshedMeal.foods_3
          ? [refreshedMeal.foods_1, refreshedMeal.foods_2, refreshedMeal.foods_3].map(
              (foods, optionIndex) => ({
                name: `Option ${optionIndex + 1}`,
                calories: refreshedMeal.calories || meal.targetCalories || 0,
                description: refreshedMeal.description || "",
                foods,
              })
            )
          : null;

      if (!refreshedOptions || refreshedOptions.length !== 3) {
        throw new Error("AI did not return three new options");
      }

      setMealOverrides((current) => ({
        ...current,
        [mealIndex]: {
          ...refreshedMeal,
          name: meal.name,
          time: meal.time,
          targetCalories: meal.targetCalories,
          options: refreshedOptions,
        },
      }));
      setSelectedOptions((current) => ({ ...current, [mealIndex]: 0 }));
      toast({
        title: "New meal options ready",
        description: `Three fresh ${meal.name.toLowerCase()} options were generated.`,
      });
    } catch (error) {
      console.error("Error refreshing meal:", error);
      toast({
        title: "Could not refresh this meal",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setRefreshingMeal(null);
    }
  };

  const handleViewRecipe = async (option: MealOption) => {
    setRecipeFoodName(option.name);
    setRecipe(null);
    setRecipeOpen(true);
    setRecipeLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { data: healthProfile, error: healthError } = await supabase
        .from("user_health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (healthError || !healthProfile) throw new Error("Health profile not found");

      const recipePromptProfile = {
        ...healthProfile,
        liked_foods: [
          ...(healthProfile.liked_foods || []),
          `RECIPE REQUEST: Create ${option.name} using ${option.foods.join(", ")}. In the option description, give clear numbered cooking steps. In the foods list, include practical quantities for each ingredient. Keep it near ${option.calories} calories per serving.`,
        ],
        disliked_foods: [
          ...(healthProfile.disliked_foods || []),
          "For this request, do not replace the requested dish with a different dish.",
        ],
      };

      const { data, error } = await supabase.functions.invoke("generate-diet", {
        body: {
          healthProfile: recipePromptProfile,
        },
      });

      if (error) throw error;

      if (data?.recipe) {
        setRecipe(data.recipe);
      } else {
        const generatedMeals: Meal[] = data?.diet?.meals || [];
        const generatedOptions = generatedMeals.flatMap((meal) => {
          if (Array.isArray(meal.options)) return meal.options;
          if (Array.isArray(meal.foods)) {
            return [{
              name: meal.name,
              calories: meal.calories || option.calories,
              description: meal.description,
              foods: meal.foods,
            }];
          }
          return [];
        });
        const generatedOption = generatedOptions.find((candidate) =>
          candidate.name.toLowerCase().includes(option.name.toLowerCase())
          || option.name.toLowerCase().includes(candidate.name.toLowerCase())
        );

        if (!generatedOption) {
          throw new Error(`AI returned a different dish instead of ${option.name}`);
        }

        const instructionText = generatedOption.description || option.description || "";
        const parsedSteps = instructionText
          .split(/(?:\s*\d+[.)]\s+|\s*;\s*)/)
          .map((step) => step.trim())
          .filter(Boolean);
        const ingredients = (generatedOption.foods?.length ? generatedOption.foods : option.foods)
          .map((food) => {
            const quantityMatch = food.match(/^(.+?)\s*[-–:]\s*(.+)$/);
            return quantityMatch
              ? { item: quantityMatch[1].trim(), amount: quantityMatch[2].trim() }
              : { item: food, amount: "As needed" };
          });

        setRecipe({
          name: option.name,
          servings: 1,
          prepTime: "15 minutes",
          cookTime: "30 minutes",
          ingredients,
          steps: parsedSteps.length >= 2
            ? parsedSteps
            : [
                instructionText || `Prepare all ingredients for ${option.name}.`,
                "Measure and prepare the ingredients listed above.",
                "Cook the main ingredients using the method described, stirring or turning as needed.",
                "Check that everything is fully cooked, adjust seasoning, and serve warm.",
              ],
          notes: [`Designed for approximately ${option.calories} kcal per serving.`],
        });
      }
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast({
        title: "Could not load the recipe",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      setRecipeOpen(false);
    } finally {
      setRecipeLoading(false);
    }
  };

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
        optionName: selectedOption.name,
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
          optionName: selectedOption.name,
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
                <div className="flex items-center justify-between gap-3">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleRefreshMeal(mealIndex)}
                    disabled={refreshingMeal !== null}
                    aria-label={`Generate three new options for ${meal.name}`}
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshingMeal === mealIndex ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">
                      {refreshingMeal === mealIndex ? "Refreshing..." : "New options"}
                    </span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {meal.options?.map((option, optionIndex) => {
                    const isSelected = selectedOptions[mealIndex] === optionIndex;
                    
                    return (
                      <Card 
                        key={optionIndex} 
                        className={`relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg ${
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
                        <CardContent className="flex flex-1 flex-col pt-2">
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
                          <div className="mt-auto pt-5">
                            <div className="mb-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                            <Button
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className={`group/recipe h-11 w-full gap-2 rounded-xl font-semibold shadow-sm transition-all duration-300 ${
                                isSelected
                                  ? "gradient-primary text-primary-foreground hover:opacity-90 hover:shadow-glow"
                                  : "border-primary/35 bg-primary/5 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md"
                              }`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleViewRecipe(option);
                              }}
                            >
                              <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-primary-foreground/15"
                                  : "bg-primary/10 group-hover/recipe:bg-primary-foreground/15"
                              }`}>
                                <BookOpen className="w-4 h-4" />
                              </span>
                              View full recipe
                            </Button>
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

          <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto break-words">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-8 text-xl">
                  <ChefHat className="w-5 h-5 text-primary" />
                  {recipe?.name || recipeFoodName}
                </DialogTitle>
                <DialogDescription>
                  AI-generated recipe for viewing only. Nothing is saved.
                </DialogDescription>
              </DialogHeader>

              {recipeLoading ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p>Preparing your recipe...</p>
                </div>
              ) : recipe ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border bg-secondary/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Servings</p>
                      <p className="font-semibold">{recipe.servings}</p>
                    </div>
                    <div className="rounded-lg border bg-secondary/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Prep</p>
                      <p className="font-semibold">{recipe.prepTime}</p>
                    </div>
                    <div className="rounded-lg border bg-secondary/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Cook</p>
                      <p className="font-semibold">{recipe.cookTime}</p>
                    </div>
                  </div>

                  <section>
                    <h3 className="mb-3 font-semibold text-foreground">Ingredients</h3>
                    <div className="divide-y rounded-lg border">
                      {recipe.ingredients.map((ingredient, index) => (
                        <div key={index} className="flex min-w-0 flex-col gap-1 px-4 py-2.5 text-sm sm:flex-row sm:justify-between sm:gap-4">
                          <span className="min-w-0 break-words">{ingredient.item}</span>
                          <span className="min-w-0 break-words font-medium text-primary sm:max-w-[45%] sm:text-right">{ingredient.amount}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-3 font-semibold text-foreground">Instructions</h3>
                    <ol className="space-y-3">
                      {recipe.steps.map((step, index) => (
                        <li key={index} className="flex min-w-0 gap-3 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {index + 1}
                          </span>
                          <span className="min-w-0 break-words pt-0.5 text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  {recipe.notes && recipe.notes.length > 0 && (
                    <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <h3 className="mb-2 font-semibold text-foreground">Notes</h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {recipe.notes.map((note, index) => <li key={index}>{note}</li>)}
                      </ul>
                    </section>
                  )}
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
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
