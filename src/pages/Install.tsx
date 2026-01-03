import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Share, Plus, Check, Smartphone } from "lucide-react";
import { routes } from "@/lib/routes";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const basePath = import.meta.env.BASE_URL || "/";
  const logoUrl = basePath.startsWith("http")
    ? new URL("logo.png", basePath).href
    : `${basePath.replace(/\/$/, "")}/logo.png`;
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <main className="px-4 pb-8 pt-8 max-w-md mx-auto space-y-6 w-full">
        <div className="text-center">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <img
              src={logoUrl}
              alt="Rima Food Tracker"
              className="w-20 h-20 object-contain drop-shadow-sm"
              loading="lazy"
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Rima Food Tracker</h2>
          <p className="text-muted-foreground">Calorie & Diet Tracker</p>
        </div>

        {isInstalled ? (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 mx-auto mb-4 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">App Installed!</h3>
              <p className="text-sm text-muted-foreground">
                Rima Food Tracker is installed on your device. You can find it on your home screen.
              </p>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Install on iPhone/iPad
              </CardTitle>
              <CardDescription>
                Follow these steps to add Rima to your home screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Share className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">1. Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">
                    Find it at the bottom of Safari (square with arrow pointing up)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">2. Tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Scroll down in the share menu to find this option
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">3. Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    Confirm to add Rima to your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Install Rima Food Tracker
              </CardTitle>
              <CardDescription>
                Add to your home screen for quick access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Works offline
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Fast loading
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Full screen experience
                </li>
              </ul>
              <Button onClick={handleInstall} className="w-full bg-[hsl(var(--primary)/0.9)] hover:bg-primary text-primary-foreground" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Install Rima Food Tracker
              </CardTitle>
              <CardDescription>
                Add to your home screen for the best experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                On Android, tap the menu button (⋮) in your browser and select "Add to Home screen" or "Install app".
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Works offline
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Fast loading
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Full screen experience
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate(routes.home)}
        >
          Continue to App
        </Button>
      </main>
    </div>
  );
};

export default Install;
