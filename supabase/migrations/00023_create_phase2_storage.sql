-- Users can upload attendance selfies to their own folder
CREATE POLICY "Users can upload attendance selfies"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND (storage.foldername(name))[2] = 'attendance'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );

-- Users can upload leave attachments to their own folder
CREATE POLICY "Users can upload leave attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND (storage.foldername(name))[2] = 'leave'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );
