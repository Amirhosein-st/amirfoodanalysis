import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2, Sparkles, X, Check } from "lucide-react";

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

interface AddWeeklyFoodDialogProps {
  dayNumber: number;
  userId: string;
  onFoodAdded: () => void;
  existingEntry?: WeeklyFoodEntry | null;
}

const AddWeeklyFoodDialog = ({ dayNumber, userId, onFoodAdded, existingEntry }: AddWeeklyFoodDialogProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(existingEntry?.image_url || null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [foodName, setFoodName] = useState(existingEntry?.food_name || "");
  const [mealType, setMealType] = useState(existingEntry?.meal_type || "lunch");
  const [calories, setCalories] = useState<number | null>(existingEntry?.calories || null);
  const [protein, setProtein] = useState<number | null>(existingEntry?.protein || null);
  const [carbs, setCarbs] = useState<number | null>(existingEntry?.carbs || null);
  const [fat, setFat] = useState<number | null>(existingEntry?.fat || null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(existingEntry?.ai_analysis || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      // Convert to base64 for AI analysis
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageBase64(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("food-images")
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast({ title: "Image uploaded", description: "Ready for AI analysis" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      toast({ title: "No image", description: "Please upload an image first", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-food-image", {
        body: { imageBase64 },
      });

      if (error) throw error;

      const analysis = data.analysis;
      setAiAnalysis(analysis);
      setFoodName(analysis.food_name || "");
      setCalories(analysis.estimated_calories || null);
      setProtein(analysis.estimated_protein || null);
      setCarbs(analysis.estimated_carbs || null);
      setFat(analysis.estimated_fat || null);

      toast({ title: "Analysis complete", description: `Detected: ${analysis.food_name}` });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({ title: "Analysis failed", description: "Could not analyze the image", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!foodName && !imageUrl) {
      toast({ title: "Missing info", description: "Please add a food name or image", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (existingEntry) {
        const { error } = await supabase
          .from("weekly_food_log")
          .update({
            meal_type: mealType,
            food_name: foodName,
            image_url: imageUrl,
            calories,
            protein,
            carbs,
            fat,
            ai_analysis: aiAnalysis,
          })
          .eq("id", existingEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("weekly_food_log")
          .insert({
            user_id: userId,
            day_number: dayNumber,
            meal_type: mealType,
            food_name: foodName,
            image_url: imageUrl,
            calories,
            protein,
            carbs,
            fat,
            ai_analysis: aiAnalysis,
          });

        if (error) throw error;
      }

      toast({ title: "Saved!", description: `Day ${dayNumber} meal saved` });
      setOpen(false);
      onFoodAdded();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (!existingEntry) {
      setImageUrl(null);
      setImageBase64(null);
      setFoodName("");
      setMealType("lunch");
      setCalories(null);
      setProtein(null);
      setCarbs(null);
      setFat(null);
      setAiAnalysis(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button 
          variant={existingEntry ? "secondary" : "outline"} 
          size="sm" 
          className="w-full"
        >
          {existingEntry ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              {existingEntry.food_name?.slice(0, 15) || "Logged"}
            </>
          ) : (
            <>
              <Camera className="w-3 h-3 mr-1" />
              Add
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Day {dayNumber} - {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</DialogTitle>
          <DialogDescription>
            Add a photo of your meal for AI analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Food Photo</Label>
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="Food" className="w-full h-48 object-cover rounded-lg" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => { setImageUrl(null); setImageBase64(null); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload photo</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </div>

          {/* AI Analyze Button */}
          {imageBase64 && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              variant="outline"
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          )}

          {/* Meal Type */}
          <div className="space-y-2">
            <Label>Meal Type</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Food Name */}
          <div className="space-y-2">
            <Label>Food Name</Label>
            <Input
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g., Grilled Chicken Salad"
            />
          </div>

          {/* Nutrition Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Calories</Label>
              <Input
                type="number"
                value={calories ?? ""}
                onChange={(e) => setCalories(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Protein (g)</Label>
              <Input
                type="number"
                value={protein ?? ""}
                onChange={(e) => setProtein(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Carbs (g)</Label>
              <Input
                type="number"
                value={carbs ?? ""}
                onChange={(e) => setCarbs(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fat (g)</Label>
              <Input
                type="number"
                value={fat ?? ""}
                onChange={(e) => setFat(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0"
              />
            </div>
          </div>

          {/* AI Analysis Result */}
          {aiAnalysis && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-primary mb-1">AI Analysis</p>
                <p className="text-sm text-muted-foreground">{aiAnalysis.description}</p>
                {aiAnalysis.health_notes && (
                  <p className="text-xs text-muted-foreground mt-1">{aiAnalysis.health_notes}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Meal"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddWeeklyFoodDialog;
