import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft, User as UserIcon, Camera, BarChart3, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import CalorieSummary from "@/components/CalorieSummary";
import FoodEntryCard from "@/components/FoodEntryCard";
import AddFoodDialog from "@/components/AddFoodDialog";
import ThemeToggle from "@/components/ThemeToggle";
import MealBreakdown from "@/components/MealBreakdown";
import IntroductionModal from "@/components/IntroductionModal";
import KcalRemainingModal from "@/components/KcalRemainingModal";
import RecipeViewerButton from "@/components/RecipeViewerButton";
import { User, Session } from "@supabase/supabase-js";
import { getMealTypeKeys } from "@/lib/mealTypes";
import { routes } from "@/lib/routes";

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

interface Profile {
  daily_calorie_goal: number | null;
  full_name: string | null;
  onboarding_completed: boolean | null;
}

interface HealthProfile {
  meals_per_day: number | null;
}

interface SavedDietPlan {
  total_calories: number;
}

interface SelectedMeal {
  name: string;
  optionName?: string;
  time: string;
  calories: number;
  description: string;
  foods: string[];
}

const getMealFoodTitle = (meal: SelectedMeal) => {
  if (meal.optionName?.trim()) return meal.optionName.trim();

  const description = meal.description.toLowerCase();
  if (description.includes("ghormeh sabzi") || description.includes("persian herb stew")) {
    return "Ghormeh Sabzi with Brown Rice";
  }
  if (
    description.includes("iranian breakfast")
    && description.includes("barbari")
    && (description.includes("feta") || description.includes("cheese"))
  ) {
    return "Naan-o Panir-o Gerdoo";
  }
  if (description.includes("platter of fresh iranian herbs")) {
    return "Sabzi Khordan with Cheese and Sangak";
  }

  const likelyDish = meal.foods.find((food) =>
    food.includes("(") || food.includes(" with ") || food.includes(" soup") || food.includes(" stew")
  ) || meal.foods[0];

  if (likelyDish) {
    return likelyDish
      .replace(/^\d+(?:[./]\d+)?\s*(?:cups?|tbsp|tsp|g|kg|oz|pieces?|slices?)?\s*/i, "")
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();
  }

  return `${meal.name} meal`;
};

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [savedDietPlan, setSavedDietPlan] = useState<SavedDietPlan | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [isMealPlanCollapsed, setIsMealPlanCollapsed] = useState(true);
  const [showKcalModal, setShowKcalModal] = useState(false);
  const [kcalRemaining, setKcalRemaining] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const fromDietPlan = (location.state as { fromDietPlan?: boolean })?.fromDietPlan ?? false;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          navigate(routes.auth);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate(routes.auth);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchFoodEntries = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("food_entries")
      .select("*")
      .eq("entry_date", today)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFoodEntries(data);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("daily_calorie_goal, full_name, onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      // Redirect to onboarding if not completed
      if (!data.onboarding_completed) {
        navigate(routes.home);
        return;
      }
      setProfile(data);
    }
  };

  const fetchHealthProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("user_health_profiles")
      .select("meals_per_day")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setHealthProfile(data);
    }
  };

  const fetchSavedDietPlan = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("saved_diet_plans")
      .select("total_calories")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setSavedDietPlan(data);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFoodEntries();
      fetchProfile();
      fetchHealthProfile();
      fetchSavedDietPlan();
    }
    }, [user]);

  // Helper function to parse time string (e.g., "7:30 AM", "1:00 PM") to minutes since midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    try {
      // Remove any extra whitespace and split by space
      const parts = timeStr.trim().split(/\s+/);
      if (parts.length < 2) return 0;
      
      const timePart = parts[0]; // e.g., "7:30"
      const period = parts[1].toUpperCase(); // e.g., "AM" or "PM"
      
      const [hours, minutes] = timePart.split(":").map(Number);
      let totalMinutes = hours * 60 + (minutes || 0);
      
      // Convert to 24-hour format
      if (period === "PM" && hours !== 12) {
        totalMinutes += 12 * 60;
      } else if (period === "AM" && hours === 12) {
        totalMinutes -= 12 * 60;
      }
      
      return totalMinutes;
    } catch (e) {
      console.error("Error parsing time string:", timeStr, e);
      return 0;
    }
  };

  // Load selected meals from localStorage
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const storageKey = `selectedMeals_${today}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
        try {
          const meals = JSON.parse(saved);
          // Sort meals by time
          const sortedMeals = [...meals].sort((a: SelectedMeal, b: SelectedMeal) => {
            const timeA = parseTimeToMinutes(a.time);
            const timeB = parseTimeToMinutes(b.time);
            return timeA - timeB;
          });
          setSelectedMeals(sortedMeals);
        } catch (e) {
        console.error("Error loading selected meals:", e);
      }
    }
  }, []);

  // Check if we should show kcal remaining modal (only when coming from home)
  useEffect(() => {
    if (!fromDietPlan && user) {
      const today = new Date().toISOString().split("T")[0];
      const kcalKey = `kcal_remaining_${today}`;
      const savedKcal = localStorage.getItem(kcalKey);

      if (!savedKcal) {
        setShowKcalModal(true);
      } else {
        setKcalRemaining(parseInt(savedKcal));
      }
    }
  }, [fromDietPlan, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(routes.auth);
  };

  const handleSaveKcalRemaining = (kcal: number) => {
    const today = new Date().toISOString().split("T")[0];
    const kcalKey = `kcal_remaining_${today}`;
    localStorage.setItem(kcalKey, kcal.toString());
    setKcalRemaining(kcal);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-4 animate-pulse-glow">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalCalories = foodEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const totalProtein = foodEntries.reduce((sum, entry) => sum + (entry.protein || 0), 0);
  const totalCarbs = foodEntries.reduce((sum, entry) => sum + (entry.carbs || 0), 0);
  const totalFat = foodEntries.reduce((sum, entry) => sum + (entry.fat || 0), 0);
  // Use kcal remaining if set today, otherwise use diet plan total calories, otherwise fall back to profile goal
  const goalCalories = kcalRemaining || savedDietPlan?.total_calories || profile?.daily_calorie_goal || 2000;

  // Get meal types based on user's meals_per_day setting
  const mealsPerDay = healthProfile?.meals_per_day || 4;
  const activeMealTypes = getMealTypeKeys(mealsPerDay);

  // Calculate calories per meal type
  const mealCalories = {
    breakfast: foodEntries.filter(e => e.meal_type === "breakfast").reduce((sum, e) => sum + e.calories, 0),
    lunch: foodEntries.filter(e => e.meal_type === "lunch").reduce((sum, e) => sum + e.calories, 0),
    dinner: foodEntries.filter(e => e.meal_type === "dinner").reduce((sum, e) => sum + e.calories, 0),
    snack: foodEntries.filter(e => e.meal_type === "snack" || !e.meal_type).reduce((sum, e) => sum + e.calories, 0),
  };

  const introSteps = [
    {
      icon: <Camera className="w-8 h-8 text-primary" />,
      title: "Track Your Meals",
      description: "Take photos or manually log your food throughout the day. Our AI analyzes your meals and provides detailed nutritional information.",
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Monitor Your Progress",
      description: "View your daily calorie intake, macros breakdown, and see how you're tracking against your personalized goals.",
    },
    {
      icon: <Calendar className="w-8 h-8 text-primary" />,
      title: "Stay Consistent",
      description: "Log your meals daily to build healthy habits. The more you track, the better insights you'll get for your nutrition journey.",
    },
  ];

  return (
    <div className="min-h-screen gradient-hero">
      <IntroductionModal
        storageKey="tracker-intro-seen"
        title="Welcome to Food Tracker! 🍽️"
        description="Let's get you started with tracking your daily nutrition"
        steps={introSteps}
      />

      <KcalRemainingModal
        isOpen={showKcalModal}
        onClose={() => setShowKcalModal(false)}
        onSave={handleSaveKcalRemaining}
      />

      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(routes.home)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Food Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate(routes.profile)}>
              <UserIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-24">
        <CalorieSummary
          totalCalories={totalCalories}
          goalCalories={goalCalories}
          protein={totalProtein}
          carbs={totalCarbs}
          fat={totalFat}
        />

        <MealBreakdown mealCalories={mealCalories} mealsPerDay={mealsPerDay} />

        {/* Selected Meals from Diet Plan */}
        {selectedMeals.length > 0 && fromDietPlan && (
          <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Today's Meal Plan</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedMeals.length} meals</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMealPlanCollapsed(!isMealPlanCollapsed)}
                >
                  {isMealPlanCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            {!isMealPlanCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedMeals.map((meal, index) => (
                  <div
                    key={index}
                    className="flex flex-col bg-card rounded-2xl shadow-soft p-4 border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 pr-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                          {meal.name}
                        </p>
                        <h3 className="break-words text-lg font-semibold leading-snug text-foreground">
                          {getMealFoodTitle(meal)}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {meal.time}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{meal.calories}</div>
                        <div className="text-xs text-muted-foreground">kcal</div>
                      </div>
                    </div>
                    {meal.description && (
                      <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>
                    )}
                    {meal.foods && meal.foods.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {meal.foods.map((food, foodIndex) => (
                          <span
                            key={foodIndex}
                            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                          >
                            {food}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-1">
                      <RecipeViewerButton
                        name={getMealFoodTitle(meal)}
                        description={meal.description}
                        foods={meal.foods || []}
                        calories={meal.calories}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Today's Entries */}
        <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Today's Food</h2>
            <span className="text-sm text-muted-foreground">{foodEntries.length} entries</span>
          </div>

          {foodEntries.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Leaf className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2">No food logged yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your meals to see your daily nutrition.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {foodEntries.map((entry) => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={fetchFoodEntries}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <AddFoodDialog onFoodAdded={fetchFoodEntries} mealsPerDay={mealsPerDay} showPortionRecommendation={fromDietPlan} />
      </div>
    </div>
  );
};

export default Index;
