-- ============================================
-- Team Logos Storage Bucket Setup
-- ============================================
-- Run this in Supabase SQL Editor to set up storage for team logos

-- Create storage bucket for tournament assets (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-assets', 'tournament-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for tournament-assets bucket

-- Allow anyone to read/view tournament assets (logos)
CREATE POLICY "Public Access for Tournament Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'tournament-assets');

-- Allow authenticated users to upload tournament assets
CREATE POLICY "Authenticated users can upload tournament assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tournament-assets' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own uploaded assets or tournament admins
CREATE POLICY "Users can update tournament assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tournament-assets' 
  AND auth.role() = 'authenticated'
);

-- Allow tournament admins to delete assets
CREATE POLICY "Admins can delete tournament assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tournament-assets' 
  AND auth.role() = 'authenticated'
);

-- Note: More restrictive policies can be added later
-- For example, only tournament admins can upload logos for their tournaments
