-- Create weekly_food_log table for 7-day meal tracking
CREATE TABLE public.weekly_food_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  meal_type TEXT NOT NULL DEFAULT 'meal',
  food_name TEXT,
  image_url TEXT,
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_food_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own weekly food log"
ON public.weekly_food_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly food log"
ON public.weekly_food_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly food log"
ON public.weekly_food_log
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly food log"
ON public.weekly_food_log
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true);

-- Storage policies for food images
CREATE POLICY "Users can view food images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Users can upload food images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their food images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their food images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);