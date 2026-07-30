import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Sparkles, Loader2, Calendar, User as UserIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { routes } from "@/lib/routes";
import { getAssetUrl } from "@/lib/utils";

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; username: string | null } | null>(null);
  const [hasSelectedMeals, setHasSelectedMeals] = useState(false);
  const logoUrl = getAssetUrl("logo.png");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate(routes.auth);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate(routes.auth);
      } else {
        checkOnboardingAndFetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const storageKey = `selectedMeals_${today}`;
    const saved = localStorage.getItem(storageKey);
    setHasSelectedMeals(!!saved);
  }, []);

  const checkOnboardingAndFetchProfile = async (userId: string) => {
    try {
      // Check if user has completed onboarding
      const { data: healthProfile } = await supabase
        .from("user_health_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!healthProfile) {
        navigate(routes.onboarding);
        return;
      }

      // Fetch profile for greeting
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, username")
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

    if (hasSelectedMeals) {
      toast({
        title: "You have a diet plan for today!",
        description: "Navigating to your tracker to view today's meal plan.",
      });
      navigate(routes.tracker, { state: { fromDietPlan: true } });
      return;
    }

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

      const { data: previousPlan } = await supabase
        .from("saved_diet_plans")
        .select("meals")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Call edge function to generate diet
      const { data, error } = await supabase.functions.invoke("generate-diet", {
        body: {
          healthProfile,
          previousMeals: Array.isArray(previousPlan?.meals) ? previousPlan.meals : [],
        },
      });

      if (error) {
        throw error;
      }

      // Navigate to diet page with the generated diet
      navigate(routes.diet, { state: { diet: data.diet } });
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

  const displayName = profile?.username?.trim()
    || profile?.full_name?.split(" ")[0]
    || "there";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Rima Food Tracker logo"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <h1 className="text-xl font-bold text-foreground">Rima Food Tracker</h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate(routes.profile)}>
              <UserIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-8 pt-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Hey {displayName}! 👋
          </h2>
          <p className="text-muted-foreground">
            What would you like to do today?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[1400px]">
          <Card 
            className="relative overflow-hidden cursor-pointer border-2 border-primary/20 bg-card shadow-lg shadow-foreground/10 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/15 dark:border-border/60 dark:bg-card/70 dark:shadow-soft transition-all duration-300 hover:-translate-y-1 group"
            onClick={() => navigate(routes.tracker, { state: { fromDietPlan: false } })}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-40 group-hover:opacity-100 dark:opacity-0 dark:group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Utensils className="w-7 h-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Track Food</CardTitle>
              <CardDescription className="text-base line-clamp-2">
                Log your meals and track your daily calories with our easy-to-use food tracker.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full group-hover:gradient-primary group-hover:text-primary-foreground transition-all duration-300" variant="secondary">
                Go to Tracker
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden cursor-pointer border-2 border-primary/20 bg-card shadow-lg shadow-foreground/10 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/15 dark:border-border/60 dark:bg-card/70 dark:shadow-soft transition-all duration-300 hover:-translate-y-1 group"
            onClick={generatingDiet ? undefined : handleGenerateDiet}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-40 group-hover:opacity-100 dark:opacity-0 dark:group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">AI Diet Plan</CardTitle>
              <CardDescription className="text-base line-clamp-2">
                Generate a personalized diet plan tailored to your unique health profile and goals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full group-hover:gradient-primary group-hover:text-primary-foreground transition-all duration-300" variant="secondary" disabled={generatingDiet}>
                {generatingDiet ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Diet"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-2 border-border bg-card shadow-md shadow-foreground/10 opacity-70 dark:border-border/60 dark:bg-card/70 dark:shadow-soft"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-40 dark:opacity-0" />
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-7 h-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">7-Day Challenge</CardTitle>
              <CardDescription className="text-base line-clamp-2">
                Coming soon — stay tuned to build healthy habits and get insights into your eating patterns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary" disabled>
                Coming soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
