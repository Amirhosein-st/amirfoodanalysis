import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import Diet from "./pages/Diet";
import Install from "./pages/Install";
import WeeklyChallenge from "./pages/WeeklyChallenge";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set initial direction based on language
    document.documentElement.dir = i18n.language === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tracker" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/diet" element={<Diet />} />
        <Route path="/install" element={<Install />} />
        <Route path="/weekly-challenge" element={<WeeklyChallenge />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
