import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Save, Loader2, Mail, Scale, Ruler, Calendar, Users, Camera, LogOut, RotateCcw } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [usernameSet, setUsernameSet] = useState(false);
  const [avatarSet, setAvatarSet] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [hasSelectedMeals, setHasSelectedMeals] = useState(false);
  const [healthProfile, setHealthProfile] = useState<{
    weight: number | null;
    height: number | null;
    age: number | null;
    gender: string | null;
  }>({ weight: null, height: null, age: null, gender: null });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleResetSelectedMeals = () => {
    const today = new Date().toISOString().split("T")[0];
    const storageKey = `selectedMeals_${today}`;
    localStorage.removeItem(storageKey);
    toast({
      title: "Selected Meals Reset",
      description: "Today's selected meal plan has been cleared.",
    });
    setIsResetConfirmOpen(false);
    setHasSelectedMeals(false); // Update state after reset
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const storageKey = `selectedMeals_${today}`;
    setHasSelectedMeals(!!localStorage.getItem(storageKey));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url, username_set, avatar_set")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setUsername(profileData.username || "");
        setAvatarUrl(profileData.avatar_url || "");
        setUsernameSet(profileData.username_set || false);
        setAvatarSet(profileData.avatar_set || false);
      }

      // Fetch health profile data
      const { data: healthData } = await supabase
        .from("user_health_profiles")
        .select("weight, height, age, gender")
        .eq("user_id", user.id)
        .maybeSingle();

      if (healthData) {
        setHealthProfile({
          weight: healthData.weight,
          height: healthData.height,
          age: healthData.age,
          gender: healthData.gender,
        });
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const updates: Record<string, unknown> = {};
      
      // Only update username if not already set
      if (!usernameSet && username.trim()) {
        updates.username = username.trim();
        updates.username_set = true;
      }
      
      // Only update avatar if not already set
      if (!avatarSet && avatarUrl.trim()) {
        updates.avatar_url = avatarUrl.trim();
        updates.avatar_set = true;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "No changes",
          description: "No editable fields to update.",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      if (updates.username_set) setUsernameSet(true);
      if (updates.avatar_set) setAvatarSet(true);

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (username) return username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || avatarSet) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, avatar_set: true })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setAvatarSet(true);

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload avatar";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <User className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground">Profile Settings</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:max-w-6xl flex-1 flex flex-col justify-center">
        <div className="grid gap-8 md:grid-cols-3 w-full">
          {/* Left Column: Avatar & Actions */}
          <div className="md:col-span-1 space-y-6 md:flex md:flex-col">
            <Card className="shadow-soft animate-slide-up h-fit md:h-full md:flex md:flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Picture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:flex-1 md:flex md:flex-col md:justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32 md:w-40 md:h-40 ring-4 ring-background shadow-xl">
                      <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
                      <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {!avatarSet && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-2 right-2 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  {avatarSet ? (
                    <p className="text-xs text-muted-foreground text-center">
                      Profile picture can only be set once
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Click the camera icon to upload a photo
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Desktop Buttons */}
            <div className="hidden md:flex gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
                  >
                    <LogOut className="w-5 h-5" />
                    Log Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be signed out and returned to the login screen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {hasSelectedMeals && (
                <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2 bg-green-600 text-primary-foreground hover:bg-green-700 h-12"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Reset Today's Meal Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently remove your selected meal plan
                        for today from your device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetSelectedMeals}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Right Column: Information */}
          <div className="md:col-span-2 space-y-6">
            {/* Account Information */}
            <Card className="shadow-soft animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        value={user?.email || ""}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={usernameSet}
                        className={usernameSet ? "bg-muted cursor-not-allowed" : ""}
                    />
                    {usernameSet && (
                        <p className="text-xs text-muted-foreground">
                        Username can only be set once
                        </p>
                    )}
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card className="shadow-soft animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Health Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      Weight
                    </Label>
                    <Input
                      id="weight"
                      value={healthProfile.weight ? `${healthProfile.weight} kg` : "Not set"}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height" className="flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      Height
                    </Label>
                    <Input
                      id="height"
                      value={healthProfile.height ? `${healthProfile.height} cm` : "Not set"}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Age
                    </Label>
                    <Input
                      id="age"
                      value={healthProfile.age ? `${healthProfile.age} years` : "Not set"}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Gender
                    </Label>
                    <Input
                      id="gender"
                      value={healthProfile.gender ? healthProfile.gender.charAt(0).toUpperCase() + healthProfile.gender.slice(1) : "Not set"}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Only show save button if there are unsaved changes */}
            {((!usernameSet && username.trim()) || (!avatarSet && avatarUrl.trim())) && (
              <div className="flex justify-end pt-4">
                <Button
                    variant="hero"
                    className="w-full md:w-auto gap-2 min-w-[200px]"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                    </>
                    ) : (
                    <>
                        <Save className="w-4 h-4" />
                        Save Changes
                    </>
                    )}
                </Button>
              </div>
            )}

            {/* Mobile Buttons */}
            <div className="flex gap-3 md:hidden">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be signed out and returned to the login screen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {hasSelectedMeals && (
                <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2 bg-green-600 text-primary-foreground hover:bg-green-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Today's Meal Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently remove your selected meal plan
                        for today from your device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetSelectedMeals}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
