-- Add username and avatar fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS username_set boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_set boolean DEFAULT false;

-- Add unique constraint on username
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);