import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Utensils, Clock, Flame, TrendingUp, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Meal {
  name: string;
  time: string;
  calories: number;
  description: string;
  foods: string[];
}

interface DietPlan {
  totalCalories: number;
  meals: Meal[];
  tips: string[];
  // Personalized diet fields
  summary?: string;
  improvements?: string[];
  weeklyPlan?: {
    day1?: string;
    day2?: string;
    day3?: string;
    day4?: string;
    day5?: string;
    day6?: string;
    day7?: string;
  };
}

const Diet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const diet = location.state?.diet as DietPlan | undefined;
  const isPersonalized = location.state?.isPersonalized as boolean | undefined;

  if (!diet) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No diet plan available</p>
        <Button onClick={() => navigate("/")}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Your Diet Plan</h1>
            {isPersonalized && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Personalized
              </Badge>
            )}
          </div>
        </div>
        <ThemeToggle />
      </header>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <main className="px-4 pb-8 space-y-6">
          {/* Summary for personalized diet */}
          {isPersonalized && diet.summary && (
            <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Your Eating Analysis
                </h3>
                <p className="text-sm text-muted-foreground">{diet.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Improvements */}
          {isPersonalized && diet.improvements && diet.improvements.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Suggested Improvements</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {diet.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold">{index + 1}.</span>
                      <span className="text-muted-foreground">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Total Calories Card */}
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="w-6 h-6 text-primary" />
                <span className="text-4xl font-bold text-foreground">
                  {diet.totalCalories}
                </span>
              </div>
              <p className="text-muted-foreground">Daily Calories Target</p>
            </CardContent>
          </Card>

          {/* Meals */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Daily Meals</h2>
            {diet.meals.map((meal, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Utensils className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{meal.name}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {meal.time}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">{meal.calories}</span>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">{meal.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {meal.foods.map((food, foodIndex) => (
                      <span
                        key={foodIndex}
                        className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Weekly Plan for personalized diet */}
          {isPersonalized && diet.weeklyPlan && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Weekly Overview</h2>
              <div className="grid gap-2">
                {Object.entries(diet.weeklyPlan).map(([day, overview]) => (
                  <Card key={day} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {day.replace("day", "")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{overview}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {diet.tips && diet.tips.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Tips for Success</h2>
              <Card>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {diet.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => navigate("/tracker")}
          >
            Start Tracking Your Meals
          </Button>
        </main>
      </ScrollArea>
    </div>
  );
};

export default Diet;
