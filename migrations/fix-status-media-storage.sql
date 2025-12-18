-- Fix Status media uploads/signing by ensuring the `status-media` bucket exists
-- and has proper Storage RLS policies.
--
-- Symptoms this fixes:
-- - "Error creating signed URL: StorageApiError: Object not found"
-- - "Failed to post status, please try again later"
--
-- NOTE: This keeps `media` bucket policies intact and adds `status-media` bucket + policies.

-- Create storage bucket for status media (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('status-media', 'status-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for status-media bucket
-- (If you already have policies with these names, this will error; in that case delete/rename existing ones.)
DO $$
BEGIN
  -- SELECT: allow reading status media (signed URLs still require object existence)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anyone can view status media'
  ) THEN
    EXECUTE $$CREATE POLICY "Anyone can view status media"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'status-media')$$;
  END IF;

  -- INSERT: authenticated users can upload status media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload status media'
  ) THEN
    EXECUTE $$CREATE POLICY "Authenticated users can upload status media"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'status-media' AND auth.role() = 'authenticated')$$;
  END IF;

  -- UPDATE: users can update own status media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own status media'
  ) THEN
    EXECUTE $$CREATE POLICY "Users can update own status media"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'status-media' AND auth.uid()::text = owner)$$;
  END IF;

  -- DELETE: users can delete own status media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own status media'
  ) THEN
    EXECUTE $$CREATE POLICY "Users can delete own status media"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'status-media' AND auth.uid()::text = owner)$$;
  END IF;
END $$;


