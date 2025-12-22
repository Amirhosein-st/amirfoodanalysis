-- Create user health profiles table
CREATE TABLE public.user_health_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  weight NUMERIC NOT NULL,
  target_weight NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('low', 'medium', 'high')),
  goal TEXT NOT NULL DEFAULT 'fat_loss',
  diet_preference TEXT NOT NULL CHECK (diet_preference IN ('normal', 'vegetarian', 'vegan', 'keto')),
  meals_per_day INTEGER NOT NULL CHECK (meals_per_day >= 1 AND meals_per_day <= 6),
  medical_conditions TEXT[] DEFAULT '{}',
  food_allergies TEXT[] DEFAULT '{}',
  disliked_foods TEXT[] DEFAULT '{}',
  liked_foods TEXT[] DEFAULT '{}',
  sleep_hours NUMERIC NOT NULL,
  water_intake NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_health_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own health profile"
ON public.user_health_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health profile"
ON public.user_health_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health profile"
ON public.user_health_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Add onboarding_completed to profiles
ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_user_health_profiles_updated_at
BEFORE UPDATE ON public.user_health_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();