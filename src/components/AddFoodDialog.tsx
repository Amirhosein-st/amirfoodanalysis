import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Utensils, Camera, Upload, Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";

const foodSchema = z.object({
  food_name: z.string().min(1, "Food name is required"),
  calories: z.number().min(0, "Calories must be positive"),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  meal_type: z.string(),
});

interface AddFoodDialogProps {
  onFoodAdded: () => void;
}

const AddFoodDialog = ({ onFoodAdded }: AddFoodDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState("snack");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisNotes, setAnalysisNotes] = useState<string | null>(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [servingSize, setServingSize] = useState("1");
  const [step, setStep] = useState<"meal" | "serving" | "details">("meal");
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setMealType("snack");
    setPreviewImage(null);
    setAnalysisNotes(null);
    setIsAnalyzed(false);
    setServingSize("1");
    setStep("meal");
  };

  const handleImageSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewImage(base64);
      await analyzeFood(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFood = async (imageBase64: string) => {
    setAnalyzing(true);
    setAnalysisNotes(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-food`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64 }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      // Auto-fill the form with analyzed data
      setFoodName(data.food_name || "");
      setCalories(data.calories?.toString() || "");
      setProtein(data.protein?.toString() || "");
      setCarbs(data.carbs?.toString() || "");
      setFat(data.fat?.toString() || "");
      setIsAnalyzed(true);
      
      if (data.notes) {
        setAnalysisNotes(data.notes);
      }

      toast({
        title: "Food analyzed!",
        description: `Identified: ${data.food_name} (${data.confidence} confidence)`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Could not analyze the image. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const servingMultiplier = parseFloat(servingSize) || 1;
      const foodData = {
        food_name: foodName,
        calories: Math.round((parseInt(calories) || 0) * servingMultiplier),
        protein: Math.round((parseFloat(protein) || 0) * servingMultiplier),
        carbs: Math.round((parseFloat(carbs) || 0) * servingMultiplier),
        fat: Math.round((parseFloat(fat) || 0) * servingMultiplier),
        meal_type: mealType,
        user_id: user.id,
      };

      foodSchema.parse(foodData);

      const { error } = await supabase.from("food_entries").insert(foodData);

      if (error) throw error;

      toast({
        title: "Food added!",
        description: `${foodName} has been logged.`,
      });

      resetForm();
      setOpen(false);
      onFoodAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add food",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="hero" size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Add Food
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            {step === "meal" && "Select Meal Type"}
            {step === "serving" && "Serving Size"}
            {step === "details" && "Add Food Entry"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Meal Type Selection */}
        {step === "meal" && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground text-center">What meal is this for?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
                { value: 'lunch', label: 'Lunch', icon: '☀️' },
                { value: 'dinner', label: 'Dinner', icon: '🌙' },
                { value: 'snack', label: 'Snack', icon: '🍎' },
              ].map((meal) => (
                <Button
                  key={meal.value}
                  variant={mealType === meal.value ? "default" : "outline"}
                  className="h-20 flex-col gap-1"
                  onClick={() => {
                    setMealType(meal.value);
                    setStep("serving");
                  }}
                >
                  <span className="text-2xl">{meal.icon}</span>
                  <span>{meal.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Serving Size */}
        {step === "serving" && (
          <div className="space-y-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("meal")}
              className="mb-2"
            >
              ← Back
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              How much of that serving did you eat?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {['0.25', '0.5', '0.75', '1'].map((size) => (
                <Button
                  key={size}
                  variant={servingSize === size ? "default" : "outline"}
                  className="h-14 flex-col"
                  onClick={() => setServingSize(size)}
                >
                  <span className="text-lg font-semibold">
                    {size === '0.25' ? '¼' : size === '0.5' ? '½' : size === '0.75' ? '¾' : '1'}
                  </span>
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="Custom serving"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                className="flex-1"
              />
              <span className="flex items-center text-muted-foreground">serving</span>
            </div>
            <Button
              variant="hero"
              className="w-full"
              onClick={() => setStep("details")}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 3: Food Details */}
        {step === "details" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("serving")}
              className="mt-2 mb-2"
            >
              ← Back
            </Button>

            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Food Analysis
              </Label>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={analyzing}
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzing}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                  e.target.value = "";
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                  e.target.value = "";
                }}
              />

              {/* Image Preview */}
              {previewImage && (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={previewImage}
                    alt="Food preview"
                    className="w-full h-40 object-cover"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-primary">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Analyzing...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {analysisNotes && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                  {analysisNotes}
                </p>
              )}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or enter manually
                </span>
              </div>
            </div>

            {/* Serving info badge */}
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {mealType.charAt(0).toUpperCase() + mealType.slice(1)} • {servingSize} serving
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="foodName">Food Name</Label>
                <Input
                  id="foodName"
                  placeholder="e.g., Grilled Chicken Salad"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  required
                  readOnly={isAnalyzed}
                  className={isAnalyzed ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calories">Calories (per full serving)</Label>
                <Input
                  id="calories"
                  type="number"
                  placeholder="0"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  required
                  readOnly={isAnalyzed}
                  className={isAnalyzed ? "bg-muted cursor-not-allowed" : ""}
                />
                {parseFloat(servingSize) !== 1 && calories && (
                  <p className="text-xs text-muted-foreground">
                    Actual calories: {Math.round(parseFloat(calories) * parseFloat(servingSize))} kcal
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    placeholder="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    readOnly={isAnalyzed}
                    className={isAnalyzed ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    placeholder="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    readOnly={isAnalyzed}
                    className={isAnalyzed ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    placeholder="0"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    readOnly={isAnalyzed}
                    className={isAnalyzed ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading || analyzing}>
                {loading ? "Adding..." : "Add Food Entry"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddFoodDialog;
