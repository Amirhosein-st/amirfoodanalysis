import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Check, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import ThemeToggle from "@/components/ThemeToggle";

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
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [generatingDiet, setGeneratingDiet] = useState(false);

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

  const handleImageUpload = async (dayNumber: number, mealType: string, file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("food-images")
        .getPublicUrl(fileName);

      // Insert food log entry
      const { data: insertedLog, error: insertError } = await supabase
        .from("weekly_food_log")
        .insert({
          user_id: user.id,
          day_number: dayNumber,
          meal_type: mealType.toLowerCase(),
          image_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setFoodLogs((prev) => [...prev, insertedLog]);

      toast({
        title: "Image uploaded",
        description: "Now analyzing with AI...",
      });

      // Analyze with AI
      await analyzeFood(insertedLog.id, urlData.publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const analyzeFood = async (logId: string, imageUrl: string) => {
    setAnalyzing(logId);
    try {
      // Fetch image and convert to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      // Update the food log with AI analysis
      const { error: updateError } = await supabase
        .from("weekly_food_log")
        .update({
          food_name: data.name,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          ai_analysis: data,
        })
        .eq("id", logId);

      if (updateError) throw updateError;

      // Update local state
      setFoodLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                food_name: data.name,
                calories: data.calories,
                protein: data.protein,
                carbs: data.carbs,
                fat: data.fat,
                ai_analysis: data,
              }
            : log
        )
      );

      toast({
        title: "Analysis complete",
        description: `Detected: ${data.name} (${data.calories} cal)`,
      });
    } catch (error) {
      console.error("Error analyzing food:", error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze the food image",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(null);
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
      // Fetch health profile
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

      // Call edge function with both food logs and health profile
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
                {hasLogs && (
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
                  <CardTitle className="text-base">{mealType}</CardTitle>
                </CardHeader>
                <CardContent>
                  {logsForMeal.length > 0 ? (
                    <div className="space-y-3">
                      {logsForMeal.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          {log.image_url && (
                            <img
                              src={log.image_url}
                              alt={log.food_name || "Food"}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            {analyzing === log.id ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">
                                  Analyzing...
                                </span>
                              </div>
                            ) : log.food_name ? (
                              <>
                                <p className="font-medium text-foreground truncate">
                                  {log.food_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {log.calories} cal • {log.protein}g P • {log.carbs}g C • {log.fat}g F
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Waiting for analysis...
                              </p>
                            )}
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
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(selectedDay, mealType, file);
                          }
                        }}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            Add photo
                          </span>
                        </>
                      )}
                    </label>
                  )}

                  {logsForMeal.length > 0 && (
                    <label className="mt-3 flex items-center justify-center p-3 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(selectedDay, mealType, file);
                          }
                        }}
                        disabled={uploading}
                      />
                      <Camera className="w-4 h-4 text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">
                        Add another
                      </span>
                    </label>
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
    </div>
  );
};

export default WeeklyChallenge;
