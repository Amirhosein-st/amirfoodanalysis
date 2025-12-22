import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Sparkles, Loader2, Trash2 } from "lucide-react";
import AddWeeklyFoodDialog from "./AddWeeklyFoodDialog";

interface WeeklyFoodEntry {
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

interface WeeklyMealTrackerProps {
  userId: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WeeklyMealTracker = ({ userId }: WeeklyMealTrackerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WeeklyFoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("weekly_food_log")
        .select("*")
        .eq("user_id", userId)
        .order("day_number", { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const getEntriesForDay = (dayNumber: number) => {
    return entries.filter((e) => e.day_number === dayNumber);
  };

  const completedDays = new Set(entries.map((e) => e.day_number)).size;
  const progress = (completedDays / 7) * 100;

  const handleGeneratePersonalizedDiet = async () => {
    if (completedDays < 7) {
      toast({
        title: "Complete all 7 days",
        description: `You've logged ${completedDays}/7 days. Complete all days for a personalized diet.`,
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // Fetch health profile
      const { data: healthProfile, error: healthError } = await supabase
        .from("user_health_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (healthError || !healthProfile) {
        toast({
          title: "Error",
          description: "Could not fetch health profile",
          variant: "destructive",
        });
        return;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke("generate-personalized-diet", {
        body: { healthProfile, weeklyFoodLog: entries },
      });

      if (error) throw error;

      // Navigate to diet page with personalized diet
      navigate("/diet", { state: { diet: data.diet, isPersonalized: true } });
    } catch (error) {
      console.error("Error generating diet:", error);
      toast({
        title: "Error",
        description: "Failed to generate personalized diet",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all weekly food entries?")) return;

    try {
      const { error } = await supabase
        .from("weekly_food_log")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      setEntries([]);
      toast({ title: "Cleared", description: "Weekly food log cleared" });
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              7-Day Meal Log
            </CardTitle>
            <CardDescription>
              Log your meals for 7 days to get a personalized AI diet plan
            </CardDescription>
          </div>
          {entries.length > 0 && (
            <Button variant="ghost" size="icon" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedDays}/7 days</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, index) => {
            const dayNumber = index + 1;
            const dayEntries = getEntriesForDay(dayNumber);
            const hasEntry = dayEntries.length > 0;
            const latestEntry = dayEntries[dayEntries.length - 1];

            return (
              <div key={day} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{day}</p>
                <div
                  className={`aspect-square rounded-lg border-2 mb-1 overflow-hidden ${
                    hasEntry ? "border-primary/50 bg-primary/10" : "border-border"
                  }`}
                >
                  {latestEntry?.image_url ? (
                    <img
                      src={latestEntry.image_url}
                      alt={latestEntry.food_name || "Food"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground/50">
                        {dayNumber}
                      </span>
                    </div>
                  )}
                </div>
                <AddWeeklyFoodDialog
                  dayNumber={dayNumber}
                  userId={userId}
                  onFoodAdded={fetchEntries}
                  existingEntry={latestEntry}
                />
              </div>
            );
          })}
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGeneratePersonalizedDiet}
          disabled={generating || completedDays < 7}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing your eating patterns...
            </>
          ) : completedDays < 7 ? (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Complete {7 - completedDays} more days
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Personalized AI Diet
            </>
          )}
        </Button>

        {completedDays === 7 && (
          <p className="text-xs text-center text-muted-foreground">
            AI will analyze your eating patterns and health profile to create a unique diet just for you
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyMealTracker;
