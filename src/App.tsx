import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import Home from "./pages/Home";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path={routes.home} element={<Home />} />
            <Route path={routes.tracker} element={<Index />} />
            <Route path={routes.auth} element={<Auth />} />
            <Route path={routes.profile} element={<Profile />} />
            <Route path={routes.onboarding} element={<Onboarding />} />
            <Route path={routes.diet} element={<Diet />} />
            <Route path={routes.install} element={<Install />} />
            <Route path={routes.weeklyChallenge} element={<WeeklyChallenge />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
