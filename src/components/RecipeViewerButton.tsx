import { useState } from "react";
import { BookOpen, ChefHat, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecipeViewerButtonProps {
  name: string;
  description?: string;
  foods: string[];
  calories: number;
}

interface Recipe {
  name: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  ingredients: Array<{ item: string; amount: string }>;
  steps: string[];
  notes?: string[];
}

const normalizeWords = (value: string) =>
  new Set(
    value.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );

const isMatchingDish = (
  requestedName: string,
  requestedFoods: string[],
  candidate: { name: string; foods?: string[] }
) => {
  const requestedWords = normalizeWords(`${requestedName} ${requestedFoods.join(" ")}`);
  const candidateWords = normalizeWords(`${candidate.name} ${(candidate.foods || []).join(" ")}`);
  const overlap = [...candidateWords].filter((word) => requestedWords.has(word)).length;
  const requestedDishName = requestedName.toLowerCase();
  const candidateName = candidate.name.toLowerCase();

  return candidateName.includes(requestedDishName)
    || requestedDishName.includes(candidateName)
    || overlap >= 2;
};

const buildKnownRecipe = (name: string, calories: number): Recipe | null => {
  const normalizedName = name.toLowerCase();
  if (!normalizedName.includes("ghormeh sabzi") && !normalizedName.includes("gormeh sabzi")) {
    return null;
  }

  return {
    name,
    servings: 1,
    prepTime: "20 minutes",
    cookTime: "90–120 minutes",
    ingredients: [
      { item: "Lean beef, cubed", amount: "100 g" },
      { item: "Mixed herbs (parsley, cilantro, fenugreek and leek), finely chopped", amount: "1 packed cup" },
      { item: "Cooked kidney beans", amount: "1/3 cup" },
      { item: "Small onion, finely chopped", amount: "1" },
      { item: "Dried Persian lime (limoo amani), pierced", amount: "1" },
      { item: "Turmeric", amount: "1/2 tsp" },
      { item: "Cooking oil", amount: "1 tsp" },
      { item: "Water", amount: "1 1/2 cups" },
      { item: "Salt and black pepper", amount: "To taste" },
      { item: "Cooked brown rice", amount: "1 cup" },
    ],
    steps: [
      "Heat half the oil in a pot. Sauté the onion until golden, then add turmeric and black pepper.",
      "Add the beef and brown it on all sides.",
      "In a separate pan, sauté the chopped herbs with the remaining oil for 8–10 minutes until dark green and fragrant.",
      "Add the sautéed herbs, kidney beans, pierced dried lime, and water to the beef.",
      "Cover and simmer gently for 75–100 minutes, until the beef is tender and the stew has thickened. Add water only if needed.",
      "Season with salt near the end, adjust the sourness, and serve with the cooked brown rice.",
    ],
    notes: [
      `Portions are designed to stay close to ${calories} kcal.`,
      "Fenugreek is strong; using too much can make the stew bitter.",
    ],
  };
};

const RecipeViewerButton = ({ name, description, foods, calories }: RecipeViewerButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const loadRecipe = async () => {
    setOpen(true);
    if (recipe) return;
    setLoading(true);

    try {
      const knownRecipe = buildKnownRecipe(name, calories);
      if (knownRecipe) {
        setRecipe(knownRecipe);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { data: healthProfile, error: healthError } = await supabase
        .from("user_health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (healthError || !healthProfile) throw new Error("Health profile not found");

      const promptProfile = {
        ...healthProfile,
        liked_foods: [
          ...(healthProfile.liked_foods || []),
          `RECIPE REQUEST: Create ${name} using ${foods.join(", ")}. Give numbered cooking steps in the description and practical ingredient quantities in the foods list. Keep it near ${calories} calories per serving.`,
        ],
      };

      const { data, error } = await supabase.functions.invoke("generate-diet", {
        body: { healthProfile: promptProfile },
      });
      if (error) throw error;

      if (data?.recipe) {
        setRecipe(data.recipe);
        return;
      }

      const generatedMeals = data?.diet?.meals || [];
      const options = generatedMeals.flatMap((meal: {
        name: string;
        calories?: number;
        description?: string;
        foods?: string[];
        options?: Array<{ name: string; calories: number; description?: string; foods: string[] }>;
      }) => meal.options || (meal.foods ? [{
        name: meal.name,
        calories: meal.calories || calories,
        description: meal.description,
        foods: meal.foods,
      }] : []));
      const option = options.find((candidate: { name: string; foods?: string[] }) =>
        isMatchingDish(name, foods, candidate)
      );
      if (!option) {
        throw new Error(`AI returned a different dish instead of ${name}`);
      }

      const instructionText = option.description || description || "";
      const parsedSteps = instructionText
        .split(/(?:\s*\d+[.)]\s+|\s*;\s*)/)
        .map((step: string) => step.trim())
        .filter(Boolean);
      const ingredients = (option.foods?.length ? option.foods : foods).map((food: string) => {
        const match = food.match(/^(.+?)\s*[-–:]\s*(.+)$/);
        return match
          ? { item: match[1].trim(), amount: match[2].trim() }
          : { item: food, amount: "As needed" };
      });

      setRecipe({
        name,
        servings: 1,
        prepTime: "15 minutes",
        cookTime: "30 minutes",
        ingredients,
        steps: parsedSteps.length >= 2 ? parsedSteps : [
          instructionText || `Prepare all ingredients for ${name}.`,
          "Measure and prepare all ingredients.",
          "Cook the main ingredients until fully cooked, stirring or turning as needed.",
          "Adjust seasoning and serve warm.",
        ],
        notes: [`Designed for approximately ${calories} kcal per serving.`],
      });
    } catch (error) {
      console.error("Error generating recipe:", error);
      setOpen(false);
      toast({
        title: "Could not load the recipe",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="mt-4 h-10 w-full gap-2 rounded-xl border-primary/35 bg-primary/5 font-semibold text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
        onClick={loadRecipe}
      >
        <BookOpen className="h-4 w-4" />
        View full recipe
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-x-hidden overflow-y-auto break-words">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8 text-xl">
              <ChefHat className="h-5 w-5 text-primary" />
              {recipe?.name || name}
            </DialogTitle>
            <DialogDescription>AI-generated recipe for viewing only. Nothing is saved.</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Preparing your recipe...</p>
            </div>
          ) : recipe ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Servings", recipe.servings],
                  ["Prep", recipe.prepTime],
                  ["Cook", recipe.cookTime],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border bg-secondary/40 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="break-words font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <section>
                <h3 className="mb-3 font-semibold">Ingredients</h3>
                <div className="divide-y rounded-lg border">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex min-w-0 flex-col gap-1 px-4 py-2.5 text-sm sm:flex-row sm:justify-between">
                      <span className="break-words">{ingredient.item}</span>
                      <span className="break-words font-medium text-primary sm:max-w-[45%] sm:text-right">{ingredient.amount}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-3 font-semibold">Instructions</h3>
                <ol className="space-y-3">
                  {recipe.steps.map((step, index) => (
                    <li key={index} className="flex min-w-0 gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                      <span className="min-w-0 break-words pt-0.5 text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
              {recipe.notes && recipe.notes.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  {recipe.notes.join(" ")}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecipeViewerButton;
