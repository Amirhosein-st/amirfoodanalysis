import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import ThemeToggle from "@/components/ThemeToggle";
import AddWeeklyFoodDialog from "@/components/AddWeeklyFoodDialog";

interface FoodLog {
  id: string;
  day_number: number;
  meal_type: string;
  food_name: string | null;
  image_url: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  ai_analysis: any;
}

const DAYS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];

const WeeklyChallenge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [generatingDiet, setGeneratingDiet] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMealType, setDialogMealType] = useState("breakfast");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchFoodLogs(session.user.id);
    });
  }, [navigate]);

  const fetchFoodLogs = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("weekly_food_log")
        .select("*")
        .eq("user_id", userId)
        .order("day_number", { ascending: true });

      if (error) throw error;
      setFoodLogs(data || []);
    } catch (error) {
      console.error("Error fetching food logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from("weekly_food_log")
        .delete()
        .eq("id", logId);

      if (error) throw error;

      setFoodLogs((prev) => prev.filter((log) => log.id !== logId));
      toast({
        title: "Deleted",
        description: "Food log entry removed",
      });
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  const getLogsForDay = (dayNumber: number) => {
    return foodLogs.filter((log) => log.day_number === dayNumber);
  };

  const getDayProgress = () => {
    const daysWithLogs = new Set(foodLogs.map((log) => log.day_number));
    return daysWithLogs.size;
  };

  const handleGeneratePersonalizedDiet = async () => {
    if (!user) return;

    const daysCompleted = getDayProgress();
    if (daysCompleted < 7) {
      toast({
        title: "Complete all 7 days",
        description: `You've logged ${daysCompleted}/7 days. Complete all days to get your personalized diet.`,
        variant: "destructive",
      });
      return;
    }

    setGeneratingDiet(true);
    try {
      const { data: healthProfile, error: healthError } = await supabase
        .from("user_health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (healthError || !healthProfile) {
        toast({
          title: "Error",
          description: "Could not fetch your health profile",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-diet", {
        body: { 
          healthProfile,
          weeklyFoodLogs: foodLogs,
          isPersonalized: true
        },
      });

      if (error) throw error;

      navigate("/diet", { state: { diet: data.diet, isPersonalized: true } });
    } catch (error) {
      console.error("Error generating diet:", error);
      toast({
        title: "Error",
        description: "Failed to generate personalized diet",
        variant: "destructive",
      });
    } finally {
      setGeneratingDiet(false);
    }
  };

  const clearAllLogs = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("weekly_food_log")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
      
      setFoodLogs([]);
      toast({
        title: "Cleared",
        description: "All food logs have been cleared",
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  const openAddDialog = (mealType: string) => {
    setDialogMealType(mealType.toLowerCase());
    setDialogOpen(true);
  };

  const handleFoodAdded = (food: FoodLog) => {
    setFoodLogs((prev) => [...prev, food]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const daysCompleted = getDayProgress();

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">7-Day Challenge</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="p-4 pb-24">
        {/* Progress */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Progress</CardTitle>
            <CardDescription>
              Log your meals for 7 days to get a personalized diet plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              {DAYS.map((_, index) => {
                const dayNum = index + 1;
                const hasLogs = foodLogs.some((log) => log.day_number === dayNum);
                return (
                  <div
                    key={dayNum}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      hasLogs
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {hasLogs ? <Check className="w-4 h-4" /> : dayNum}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {daysCompleted}/7 days completed
            </p>
          </CardContent>
        </Card>

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {DAYS.map((day, index) => {
            const dayNum = index + 1;
            const hasLogs = foodLogs.some((log) => log.day_number === dayNum);
            return (
              <Button
                key={dayNum}
                variant={selectedDay === dayNum ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(dayNum)}
                className="relative"
              >
                {day}
                {hasLogs && selectedDay !== dayNum && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
            );
          })}
        </div>

        {/* Meals for Selected Day */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {DAYS[selectedDay - 1]} Meals
          </h2>

          {MEAL_TYPES.map((mealType) => {
            const logsForMeal = getLogsForDay(selectedDay).filter(
              (log) => log.meal_type === mealType.toLowerCase()
            );

            return (
              <Card key={mealType}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{mealType}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAddDialog(mealType)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {logsForMeal.length > 0 ? (
                    <div className="space-y-3">
                      {logsForMeal.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          {log.image_url && (
                            <img
                              src={log.image_url}
                              alt={log.food_name || "Food"}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {log.food_name || "Unknown food"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {log.calories || 0} cal • {log.protein || 0}g P • {log.carbs || 0}g C • {log.fat || 0}g F
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLog(log.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => openAddDialog(mealType)}
                      className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    >
                      <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Add {mealType}
                      </span>
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Clear All Button */}
        {foodLogs.length > 0 && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={clearAllLogs}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Logs
          </Button>
        )}
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          className="w-full"
          size="lg"
          onClick={handleGeneratePersonalizedDiet}
          disabled={daysCompleted < 7 || generatingDiet}
        >
          {generatingDiet ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Personalized Diet ({daysCompleted}/7 days)
            </>
          )}
        </Button>
      </div>

      {/* Add Food Dialog */}
      {user && (
        <AddWeeklyFoodDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.id}
          dayNumber={selectedDay}
          defaultMealType={dialogMealType}
          onFoodAdded={handleFoodAdded}
        />
      )}
    </div>
  );
};

export default WeeklyChallenge;
