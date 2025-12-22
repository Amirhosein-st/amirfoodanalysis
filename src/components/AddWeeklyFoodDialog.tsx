import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Camera, Upload, Sparkles, Utensils, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getMealTypesForCount } from "@/lib/mealTypes";

interface AddWeeklyFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  dayNumber: number;
  defaultMealType: string;
  onFoodAdded: (food: any) => void;
  mealsPerDay: number;
}

const AddWeeklyFoodDialog = ({
  open,
  onOpenChange,
  userId,
  dayNumber,
  defaultMealType,
  onFoodAdded,
  mealsPerDay,
}: AddWeeklyFoodDialogProps) => {
  const mealTypes = getMealTypesForCount(mealsPerDay);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAiAnalyzed, setIsAiAnalyzed] = useState(false);

  const [formData, setFormData] = useState({
    foodName: "",
    calories: "",
    mealType: defaultMealType,
    protein: "",
    carbs: "",
    fat: "",
  });

  // Update mealType when dialog opens with a new defaultMealType
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        mealType: defaultMealType,
      }));
    }
  }, [open, defaultMealType]);

  const resetForm = () => {
    setFormData({
      foodName: "",
      calories: "",
      mealType: defaultMealType,
      protein: "",
      carbs: "",
      fat: "",
    });
    setImagePreview(null);
    setImageFile(null);
    setIsAnalyzing(false);
    setIsSubmitting(false);
    setIsAiAnalyzed(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleImageSelect = async (file: File) => {
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze with AI
    await analyzeImage(file);
  };

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      const foodName = data.food_name || data.name || "";
      
      setFormData(prev => ({
        ...prev,
        foodName: foodName,
        calories: String(data.calories || 0),
        protein: String(data.protein || 0),
        carbs: String(data.carbs || 0),
        fat: String(data.fat || 0),
      }));

      setIsAiAnalyzed(true);

      toast({
        title: "Analysis complete",
        description: `Detected: ${foodName}`,
      });
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze the image. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.foodName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a food name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = null;

      // Upload image if exists
      if (imageFile) {
        // Sanitize filename: remove non-ASCII characters and replace spaces
        const sanitizedName = imageFile.name
          .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/[^a-zA-Z0-9._-]/g, ''); // Keep only safe characters
        const fileName = `${userId}/${Date.now()}_${sanitizedName || 'image.jpg'}`;
        const { error: uploadError } = await supabase.storage
          .from("food-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("food-images")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      // Insert food log
      const { data: insertedLog, error: insertError } = await supabase
        .from("weekly_food_log")
        .insert({
          user_id: userId,
          day_number: dayNumber,
          meal_type: formData.mealType,
          food_name: formData.foodName,
          calories: parseInt(formData.calories) || 0,
          protein: parseFloat(formData.protein) || 0,
          carbs: parseFloat(formData.carbs) || 0,
          fat: parseFloat(formData.fat) || 0,
          image_url: imageUrl,
          ai_analysis: imageFile ? { analyzed: true } : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onFoodAdded(insertedLog);
      handleClose();

      toast({
        title: "Food added",
        description: `${formData.foodName} added to Day ${dayNumber}`,
      });
    } catch (error) {
      console.error("Error adding food:", error);
      toast({
        title: "Error",
        description: "Failed to add food entry",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Utensils className="w-5 h-5 text-primary" />
            Add Food Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Analysis Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Food Analysis
            </div>

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-40 object-cover rounded-lg"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-2 text-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            )}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageSelect(file);
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
              }}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">
              Or Enter Manually
            </span>
          </div>

          {/* Manual Entry Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="foodName" className="text-foreground">Food Name</Label>
              <Input
                id="foodName"
                placeholder="e.g., Grilled Chicken Salad"
                value={formData.foodName}
                onChange={(e) =>
                  setFormData({ ...formData, foodName: e.target.value })
                }
                className="bg-background border-border"
                disabled={isAiAnalyzed}
                readOnly={isAiAnalyzed}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories" className="text-foreground">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  min={0}
                  value={formData.calories}
                  onChange={(e) =>
                    setFormData({ ...formData, calories: e.target.value })
                  }
                  className="bg-background border-border"
                  disabled={isAiAnalyzed}
                  readOnly={isAiAnalyzed}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein" className="text-foreground">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  min={0}
                  value={formData.protein}
                  onChange={(e) =>
                    setFormData({ ...formData, protein: e.target.value })
                  }
                  className="bg-background border-border"
                  disabled={isAiAnalyzed}
                  readOnly={isAiAnalyzed}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carbs" className="text-foreground">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  min={0}
                  value={formData.carbs}
                  onChange={(e) =>
                    setFormData({ ...formData, carbs: e.target.value })
                  }
                  className="bg-background border-border"
                  disabled={isAiAnalyzed}
                  readOnly={isAiAnalyzed}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat" className="text-foreground">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  min={0}
                  value={formData.fat}
                  onChange={(e) =>
                    setFormData({ ...formData, fat: e.target.value })
                  }
                  className="bg-background border-border"
                  disabled={isAiAnalyzed}
                  readOnly={isAiAnalyzed}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || isAnalyzing}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Food Entry"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddWeeklyFoodDialog;
