import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft, User as UserIcon } from "lucide-react";
import CalorieSummary from "@/components/CalorieSummary";
import FoodEntryCard from "@/components/FoodEntryCard";
import AddFoodDialog from "@/components/AddFoodDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { User, Session } from "@supabase/supabase-js";

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

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
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
        navigate("/");
        return;
      }
      setProfile(data);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFoodEntries();
      fetchProfile();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
  const goalCalories = profile?.daily_calorie_goal || 2000;

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl gradient-primary shadow-soft flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Food Tracker</h1>
              <p className="text-xs text-muted-foreground">
                {profile?.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Track your nutrition"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <UserIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6 pb-24">
        <CalorieSummary
          totalCalories={totalCalories}
          goalCalories={goalCalories}
          protein={totalProtein}
          carbs={totalCarbs}
          fat={totalFat}
        />

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
        <AddFoodDialog onFoodAdded={fetchFoodEntries} />
      </div>
    </div>
  );
};

export default Index;
