import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Sparkles, Loader2, User as UserIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import WeeklyMealTracker from "@/components/WeeklyMealTracker";

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkOnboardingAndFetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkOnboardingAndFetchProfile = async (userId: string) => {
    try {
      // Check if user has completed onboarding
      const { data: healthProfile } = await supabase
        .from("user_health_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!healthProfile) {
        navigate("/onboarding");
        return;
      }

      // Fetch profile for greeting
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error("Error checking onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDiet = async () => {
    if (!user) return;

    setGeneratingDiet(true);
    try {
      // Fetch user health profile
      const { data: healthProfile, error: healthError } = await supabase
        .from("user_health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (healthError || !healthProfile) {
        toast({
          title: "Error",
          description: "Could not fetch your health profile. Please complete onboarding first.",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to generate diet
      const { data, error } = await supabase.functions.invoke("generate-diet", {
        body: { healthProfile },
      });

      if (error) {
        throw error;
      }

      // Navigate to diet page with the generated diet
      navigate("/diet", { state: { diet: data.diet } });
    } catch (error) {
      console.error("Error generating diet:", error);
      toast({
        title: "Error",
        description: "Failed to generate diet plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingDiet(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">NutriTrack</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <UserIcon className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 pb-8 space-y-6">
        {/* Greeting */}
        <div className="text-center pt-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Hey {firstName}! 👋
          </h2>
          <p className="text-muted-foreground text-sm">
            What would you like to do today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            onClick={() => navigate("/tracker")}
          >
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Utensils className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm">Track Food</p>
              <p className="text-xs text-muted-foreground">Log daily meals</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            onClick={generatingDiet ? undefined : handleGenerateDiet}
          >
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                {generatingDiet ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-primary" />
                )}
              </div>
              <p className="font-medium text-sm">Quick Diet</p>
              <p className="text-xs text-muted-foreground">AI generated</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Meal Tracker */}
        {user && <WeeklyMealTracker userId={user.id} />}
      </main>
    </div>
  );
};

export default Home;
