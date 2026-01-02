import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Leaf, ArrowLeft, ArrowRight, Check, Plus, X, Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface OnboardingData {
  weight: number | null;
  targetWeight: number | null;
  height: number | null;
  age: number | null;
  nationality: string | null;
  gender: string | null;
  activityLevel: string | null;
  dietPreference: string | null;
  mealsPerDay: number | null;
  medicalConditions: string[];
  foodAllergies: string[];
  dislikedFoods: string[];
  likedFoods: string[];
  sleepHours: number | null;
  waterIntake: number | null;
}

const TOTAL_STEPS = 15;

const commonNationalities = [
  "American", "British", "Canadian", "Australian", "Indian", 
  "Chinese", "Japanese", "Korean", "Brazilian", "Mexican",
  "German", "French", "Italian", "Spanish", "Dutch",
  "Russian", "Turkish", "Saudi", "Emirati", "Egyptian", "Iranian"
];

const commonMedicalConditions = ["Diabetes", "Hypertension", "Heart Disease", "Thyroid Issues", "PCOS"];
const commonAllergies = ["Peanuts", "Tree Nuts", "Dairy", "Eggs", "Shellfish", "Gluten", "Soy"];
const commonFoods = ["Broccoli", "Spinach", "Chicken", "Fish", "Beef", "Tofu", "Rice", "Pasta", "Cheese", "Yogurt"];

const Onboarding = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [data, setData] = useState<OnboardingData>({
    weight: null,
    targetWeight: null,
    height: null,
    age: null,
    nationality: null,
    gender: null,
    activityLevel: null,
    dietPreference: null,
    mealsPerDay: null,
    medicalConditions: [],
    foodAllergies: [],
    dislikedFoods: [],
    likedFoods: [],
    sleepHours: null,
    waterIntake: null,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const updateData = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const toggleArrayItem = (key: keyof OnboardingData, item: string) => {
    const arr = data[key] as string[];
    if (arr.includes(item)) {
      updateData(key, arr.filter((i) => i !== item) as any);
    } else {
      updateData(key, [...arr, item] as any);
    }
  };

  const addCustomItem = (key: keyof OnboardingData) => {
    if (!customInput.trim()) return;
    const arr = data[key] as string[];
    if (!arr.includes(customInput.trim())) {
      updateData(key, [...arr, customInput.trim()] as any);
    }
    setCustomInput("");
  };

  const validateStep = (): boolean => {
    setError(null);
    
    switch (currentStep) {
      case 1:
        if (!data.weight || data.weight < 30 || data.weight > 250) {
          setError("Please enter a valid weight between 30-250 kg");
          return false;
        }
        break;
      case 2:
        if (!data.targetWeight || data.targetWeight < 30 || data.targetWeight > 250) {
          setError("Please enter a valid target weight between 30-250 kg");
          return false;
        }
        if (data.weight && data.targetWeight > data.weight) {
          setError("Target weight should be less than or equal to current weight for fat loss");
          return false;
        }
        break;
      case 3:
        if (!data.height || data.height < 120 || data.height > 230) {
          setError("Please enter a valid height between 120-230 cm");
          return false;
        }
        break;
      case 4:
        if (!data.age || data.age < 10 || data.age > 100) {
          setError("Please enter a valid age between 10-100 years");
          return false;
        }
        break;
      case 5:
        if (!data.nationality) {
          setError("Please select your nationality");
          return false;
        }
        break;
      case 6:
        if (!data.gender) {
          setError("Please select your gender");
          return false;
        }
        break;
      case 7:
        if (!data.activityLevel) {
          setError("Please select your activity level");
          return false;
        }
        break;
      case 8:
        if (!data.dietPreference) {
          setError("Please select your diet preference");
          return false;
        }
        break;
      case 9:
        if (!data.mealsPerDay || data.mealsPerDay < 2 || data.mealsPerDay > 4) {
          setError("Please select meals per day (2-4)");
          return false;
        }
        break;
      case 14:
        if (data.sleepHours === null || data.sleepHours < 0 || data.sleepHours > 16) {
          setError("Please enter valid sleep hours (0-16)");
          return false;
        }
        break;
      case 15:
        if (data.waterIntake === null || data.waterIntake < 0 || data.waterIntake > 10) {
          setError("Please enter valid water intake (0-10 liters)");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Insert health profile
      const { error: healthError } = await supabase.from("user_health_profiles").insert({
        user_id: user.id,
        weight: data.weight!,
        target_weight: data.targetWeight!,
        height: data.height!,
        age: data.age!,
        nationality: data.nationality,
        gender: data.gender!,
        activity_level: data.activityLevel!,
        goal: "fat_loss",
        diet_preference: data.dietPreference!,
        meals_per_day: data.mealsPerDay!,
        medical_conditions: data.medicalConditions,
        food_allergies: data.foodAllergies,
        disliked_foods: data.dislikedFoods,
        liked_foods: data.likedFoods,
        sleep_hours: data.sleepHours!,
        water_intake: data.waterIntake!,
      });

      if (healthError) throw healthError;

      // Mark onboarding as completed
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      toast({
        title: "Profile complete!",
        description: "Your health profile has been saved.",
      });

      navigate("/");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">What's your current weight?</h2>
            <p className="text-muted-foreground">This helps us calculate your calorie needs</p>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                value={data.weight || ""}
                onChange={(e) => updateData("weight", parseFloat(e.target.value) || null)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleNext())}
                min={30}
                max={250}
                className="text-lg h-14"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">What's your target weight?</h2>
            <p className="text-muted-foreground">Your goal weight for fat loss</p>
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Target Weight (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                placeholder="65"
                value={data.targetWeight || ""}
                onChange={(e) => updateData("targetWeight", parseFloat(e.target.value) || null)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleNext())}
                min={30}
                max={250}
                className="text-lg h-14"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">How tall are you?</h2>
            <p className="text-muted-foreground">Your height in centimeters</p>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="170"
                value={data.height || ""}
                onChange={(e) => updateData("height", parseFloat(e.target.value) || null)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleNext())}
                min={120}
                max={230}
                className="text-lg h-14"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">How old are you?</h2>
            <p className="text-muted-foreground">Age affects your metabolism</p>
            <div className="space-y-2">
              <Label htmlFor="age">Age (years)</Label>
              <Input
                id="age"
                type="number"
                placeholder="30"
                value={data.age || ""}
                onChange={(e) => updateData("age", parseInt(e.target.value) || null)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleNext())}
                min={10}
                max={100}
                className="text-lg h-14"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">What's your nationality?</h2>
            <p className="text-muted-foreground">This helps customize meal suggestions to your cuisine</p>
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {commonNationalities.map((nat) => (
                <Button
                  key={nat}
                  type="button"
                  variant={data.nationality === nat ? "default" : "outline"}
                  className={`h-12 text-sm ${data.nationality === nat ? "gradient-primary text-primary-foreground" : ""}`}
                  onClick={() => updateData("nationality", nat)}
                >
                  {nat}
                </Button>
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="customNationality">Or enter your nationality</Label>
              <Input
                id="customNationality"
                type="text"
                placeholder="Your nationality"
                value={data.nationality && !commonNationalities.includes(data.nationality) ? data.nationality : ""}
                onChange={(e) => updateData("nationality", e.target.value || null)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleNext())}
                className="text-lg h-14"
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">What's your gender?</h2>
            <p className="text-muted-foreground">This helps calculate accurate calorie needs</p>
            <div className="grid grid-cols-2 gap-4">
              {["male", "female"].map((gender) => (
                <Button
                  key={gender}
                  type="button"
                  variant={data.gender === gender ? "default" : "outline"}
                  className={`h-20 text-lg capitalize ${data.gender === gender ? "gradient-primary text-primary-foreground" : ""}`}
                  onClick={() => updateData("gender", gender)}
                >
                  {gender}
                </Button>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">How active are you?</h2>
            <p className="text-muted-foreground">Your typical daily activity level</p>
            <div className="space-y-3">
              {[
                { value: "low", label: "Low", desc: "Mostly sedentary, desk job" },
                { value: "medium", label: "Medium", desc: "Some exercise, moderate activity" },
                { value: "high", label: "High", desc: "Very active, regular intense exercise" },
              ].map((level) => (
                <Button
                  key={level.value}
                  type="button"
                  variant={data.activityLevel === level.value ? "default" : "outline"}
                  className={`w-full h-auto py-4 flex flex-col items-start ${data.activityLevel === level.value ? "gradient-primary text-primary-foreground" : ""}`}
                  onClick={() => updateData("activityLevel", level.value)}
                >
                  <span className="font-semibold">{level.label}</span>
                  <span className={`text-sm ${data.activityLevel === level.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {level.desc}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">What's your diet preference?</h2>
            <p className="text-muted-foreground">We'll customize meal suggestions accordingly</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "normal", label: "Normal" },
                { value: "vegetarian", label: "Vegetarian" },
                { value: "vegan", label: "Vegan" },
                { value: "keto", label: "Keto" },
              ].map((diet) => (
                <Button
                  key={diet.value}
                  type="button"
                  variant={data.dietPreference === diet.value ? "default" : "outline"}
                  className={`h-16 text-lg ${data.dietPreference === diet.value ? "gradient-primary text-primary-foreground" : ""}`}
                  onClick={() => updateData("dietPreference", diet.value)}
                >
                  {diet.label}
                </Button>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">How many meals per day?</h2>
            <p className="text-muted-foreground">Including snacks</p>
            <div className="grid grid-cols-3 gap-3">
              {[2, 3, 4].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={data.mealsPerDay === num ? "default" : "outline"}
                  className={`h-16 text-xl ${data.mealsPerDay === num ? "gradient-primary text-primary-foreground" : ""}`}
                  onClick={() => updateData("mealsPerDay", num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        );

      case 10:
        return renderChipsStep(
          "Any medical conditions?",
          "Select all that apply (optional)",
          "medicalConditions",
          commonMedicalConditions
        );

      case 11:
        return renderChipsStep(
          "Any food allergies?",
          "Select all that apply (optional)",
          "foodAllergies",
          commonAllergies
        );

      case 12:
        return renderChipsStep(
          "Foods you dislike?",
          "We'll avoid these in recommendations (optional)",
          "dislikedFoods",
          commonFoods
        );

      case 13:
        return renderChipsStep(
          "Foods you enjoy?",
          "We'll include these in recommendations (optional)",
          "likedFoods",
          commonFoods
        );

      case 14:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">How many hours do you sleep?</h2>
            <p className="text-muted-foreground">Average hours per night</p>
            <div className="space-y-2">
              <Label htmlFor="sleep">Sleep (hours)</Label>
              <Input
                id="sleep"
                type="number"
                placeholder="7.5"
                step="0.5"
                value={data.sleepHours ?? ""}
                onChange={(e) => updateData("sleepHours", parseFloat(e.target.value) ?? null)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleNext())}
                min={0}
                max={16}
                className="text-lg h-14"
              />
            </div>
          </div>
        );

      case 15:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Daily water intake?</h2>
            <p className="text-muted-foreground">How much water do you drink per day?</p>
            <div className="space-y-2">
              <Label htmlFor="water">Water (liters)</Label>
              <Input
                id="water"
                type="number"
                placeholder="2.5"
                step="0.5"
                value={data.waterIntake ?? ""}
                onChange={(e) => updateData("waterIntake", parseFloat(e.target.value) ?? null)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleNext())}
                min={0}
                max={10}
                className="text-lg h-14"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderChipsStep = (
    title: string,
    subtitle: string,
    key: keyof OnboardingData,
    options: string[]
  ) => {
    const selected = data[key] as string[];
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
        <div className="flex flex-wrap gap-2">
          {options.map((item) => (
            <Badge
              key={item}
              variant={selected.includes(item) ? "default" : "outline"}
              className={`cursor-pointer py-2 px-4 text-sm ${selected.includes(item) ? "bg-primary text-primary-foreground" : ""}`}
              onClick={() => toggleArrayItem(key, item)}
            >
              {item}
              {selected.includes(item) && <Check className="w-3 h-3 ml-1" />}
            </Badge>
          ))}
        </div>
        {/* Custom items */}
        {selected.filter((i) => !options.includes(i)).map((item) => (
          <Badge
            key={item}
            className="bg-primary text-primary-foreground py-2 px-4 text-sm"
          >
            {item}
            <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => toggleArrayItem(key, item)} />
          </Badge>
        ))}
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Add custom..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomItem(key))}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => addCustomItem(key)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary shadow-soft flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Rima Food Tracker</h1>
              <p className="text-xs text-muted-foreground">Let's personalize your experience</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
          <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-md">
        <div className="bg-card rounded-2xl shadow-soft p-6 animate-fade-in">
          {renderStepContent()}
          
          {error && (
            <p className="text-destructive text-sm mt-4 bg-destructive/10 p-3 rounded-lg">{error}</p>
          )}
        </div>
      </main>

      {/* Navigation */}
      <footer className="bg-card/80 backdrop-blur-lg border-t border-border">
        <div className="container mx-auto px-4 py-4 max-w-md flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={handleBack}
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            variant="hero"
            className="flex-1 h-12"
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : currentStep === TOTAL_STEPS ? (
              <>
                Complete
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;
