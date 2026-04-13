-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vizportal-storage', 'vizportal-storage', false);

-- Authenticated users can read files from their company
CREATE POLICY "Company members can read files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
  );

-- Admin/HR can upload any file in their company
CREATE POLICY "Admin/HR can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND has_any_role(ARRAY['admin', 'hr'])
  );

-- Users can upload to their own documents folder
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND (storage.foldername(name))[2] = 'documents'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );

-- Users can upload own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND (storage.foldername(name))[2] = 'avatars'
    AND storage.filename(name) LIKE auth.uid()::text || '.%'
  );

-- Admin/HR can delete files
CREATE POLICY "Admin/HR can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND has_any_role(ARRAY['admin', 'hr'])
  );
