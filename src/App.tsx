import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import Diet from "./pages/Diet";
import Install from "./pages/Install";
import WeeklyChallenge from "./pages/WeeklyChallenge";
import NotFound from "./pages/NotFound";
import { routes } from "@/lib/routes";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      setAuthChecked(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {authChecked ? (
              <Routes>
                <Route path={routes.home} element={isAuthenticated ? <Home /> : <Landing />} />
                <Route path={routes.tracker} element={<Index />} />
                <Route path={routes.auth} element={<Auth />} />
                <Route path={routes.profile} element={<Profile />} />
                <Route path={routes.onboarding} element={<Onboarding />} />
                <Route path={routes.diet} element={<Diet />} />
                <Route path={routes.install} element={<Install />} />
                <Route path={routes.weeklyChallenge} element={<WeeklyChallenge />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
