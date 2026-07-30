import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Sparkles,
  TrendingUp,
  Calendar,
  Shield,
  Zap,
  Users,
  Star,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { routes } from "@/lib/routes";
import { getAssetUrl } from "@/lib/utils";

const Landing = () => {
  const navigate = useNavigate();
  const logoUrl = getAssetUrl("logo.png");

  const features = [
    {
      icon: Camera,
      title: "AI-Powered Food Analysis",
      description: "Simply take a photo of your meal and our advanced AI instantly analyzes calories, macros, and nutritional information.",
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Sparkles,
      title: "Personalized Diet Plans",
      description: "Get custom meal recommendations based on your health profile, goals, and preferences tailored just for you.",
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: TrendingUp,
      title: "Smart Progress Tracking",
      description: "Monitor your nutrition journey with detailed analytics, trends, and insights to keep you motivated.",
      color: "text-green-600 dark:text-green-400"
    },
    {
      icon: Calendar,
      title: "7-Day Wellness Challenge",
      description: "Build healthy eating habits with our structured 7-day program that rewards consistency and progress.",
      color: "text-orange-600 dark:text-orange-400",
      status: "Coming soon",
      disabled: true
    }
  ];

  const benefits = [
    "Accurate calorie and macro tracking",
    "Personalized meal recommendations",
    "Real-time progress insights",
    "Build lasting healthy habits",
    "Expert nutrition guidance",
    "Mobile-friendly design"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white/95 backdrop-blur dark:bg-[#0f1f1b]">
        <div className="container mx-auto flex items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <img
              src={logoUrl}
              alt="Rima Food Tracker logo"
              className="h-8 w-8 rounded-lg object-cover shadow-md sm:h-9 sm:w-9 sm:rounded-xl"
            />
            <h1 aria-label="Rima Food Tracker" className="shrink-0">
              <span
                aria-hidden="true"
                className="flex items-baseline gap-1.5 whitespace-nowrap sm:hidden"
              >
                <span className="text-lg font-bold tracking-tight text-foreground">Rima</span>
                <span className="bg-gradient-to-br from-[#2d7d45] via-[#4f9f50] to-[#79bc55] bg-clip-text text-xl font-extrabold text-transparent">
                  F
                </span>
                <span className="bg-gradient-to-br from-[#ff8500] via-[#ffa51f] to-[#ffc45a] bg-clip-text text-xl font-extrabold text-transparent">
                  T
                </span>
              </span>
              <span className="hidden whitespace-nowrap text-xl font-bold leading-none text-foreground sm:inline">
                Rima Food Tracker
              </span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <div className="[&>button]:h-9 [&>button]:w-9 sm:[&>button]:h-10 sm:[&>button]:w-10">
              <ThemeToggle />
            </div>
            <Button
              className="h-9 px-3 sm:h-10 sm:px-4"
              onClick={() => navigate(routes.auth)}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="h-[61px] sm:h-[73px]" />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium">
              <Star className="w-4 h-4 mr-2" />
              #1 AI-Powered Nutrition Tracker
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Transform Your Health with
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"> Smart Nutrition</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
              Track meals effortlessly with AI-powered photo analysis, get personalized diet plans, and build healthy habits with our comprehensive food tracking platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                size="lg"
                className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>AI-Powered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need for Better Nutrition
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform combines cutting-edge AI technology with personalized nutrition guidance to help you achieve your health goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm ${feature.disabled ? "opacity-60 pointer-events-none cursor-not-allowed" : ""}`}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  {feature.status && (
                    <Badge variant="secondary" className="mt-1 mx-auto">
                      {feature.status}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Choose Rima Food Tracker?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join our users who have transformed their relationship with food and achieved their health goals with our intelligent nutrition platform.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold"
                  onClick={() => navigate(routes.auth)}
                >
                  Start Tracking Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <Card className="p-8 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                  <p className="text-muted-foreground mb-6">
                    Join our community of health-conscious individuals and start your journey towards better nutrition today.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={() => navigate(routes.auth)}>
                      Sign Up Free
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Nutrition Journey?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join our users who are already using AI-powered nutrition tracking to achieve their health goals.
          </p>

          <Button
            size="lg"
            className="px-12 py-6 text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => navigate(routes.auth)}
          >
            Get Started Now - It's Free!
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Start tracking in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background/80 backdrop-blur-lg border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">

            <div className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt="Rima Food Tracker logo"
                className="w-9 h-9 rounded-xl object-cover shadow-md"
              />
              <span className="text-lg font-bold text-foreground">Rima Food Tracker</span>
            </div>

            {/* <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div> */}

            <p className="text-sm text-muted-foreground">
              © 2026 Rima Food Tracker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
