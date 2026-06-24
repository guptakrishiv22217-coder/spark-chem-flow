
-- Fix overly permissive policy on material_safety_data
DROP POLICY IF EXISTS "Team members can modify safety data" ON public.material_safety_data;

CREATE POLICY "Authenticated can insert safety data"
ON public.material_safety_data
FOR INSERT
TO authenticated
WITH CHECK (reviewed_by = auth.uid());

CREATE POLICY "Reviewer can update own safety data"
ON public.material_safety_data
FOR UPDATE
TO authenticated
USING (reviewed_by = auth.uid())
WITH CHECK (reviewed_by = auth.uid());

CREATE POLICY "Reviewer can delete own safety data"
ON public.material_safety_data
FOR DELETE
TO authenticated
USING (reviewed_by = auth.uid());

-- Add UPDATE/DELETE policies for sds-documents storage bucket, scoped to the uploader
CREATE POLICY "Uploader can update SDS files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'sds-documents' AND owner = auth.uid())
WITH CHECK (bucket_id = 'sds-documents' AND owner = auth.uid());

CREATE POLICY "Uploader can delete SDS files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sds-documents' AND owner = auth.uid());
