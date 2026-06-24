-- Migration: Add email and hours columns to public.branches
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS hours text;
