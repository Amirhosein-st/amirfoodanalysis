import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Sparkles, Loader2, Calendar } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

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
        <ThemeToggle />
      </header>

      <main className="px-4 pb-8 pt-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Hey {firstName}! 👋
          </h2>
          <p className="text-muted-foreground">
            What would you like to do today?
          </p>
        </div>

        <div className="grid gap-4 w-full max-w-md">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            onClick={() => navigate("/tracker")}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Utensils className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Track Food</CardTitle>
              <CardDescription>
                Log your meals and track your daily calories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Go to Tracker
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            onClick={generatingDiet ? undefined : handleGenerateDiet}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Get AI Diet Plan</CardTitle>
              <CardDescription>
                Generate a personalized diet based on your health profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={generatingDiet}>
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
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            onClick={() => navigate("/weekly-challenge")}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>7-Day Challenge</CardTitle>
              <CardDescription>
                Log your meals for 7 days and get a unique AI diet plan based on your eating habits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Start Challenge
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
