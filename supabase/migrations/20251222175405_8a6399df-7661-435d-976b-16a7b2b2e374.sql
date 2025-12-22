-- Add nationality column to user_health_profiles
ALTER TABLE public.user_health_profiles 
ADD COLUMN nationality text;