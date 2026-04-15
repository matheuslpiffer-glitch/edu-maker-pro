
-- Add storage.objects policies for the essay-images bucket

-- Allow public read access to files (needed for AI Vision URL access)
CREATE POLICY "Public can read essay images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'essay-images');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload essay images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'essay-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own essay images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'essay-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own essay images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'essay-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
