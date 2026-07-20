
ALTER TABLE public.project_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.project_messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.project_messages ADD CONSTRAINT project_messages_body_or_image
  CHECK (body IS NOT NULL OR image_url IS NOT NULL);

-- Storage policies for chat-images bucket
CREATE POLICY "chat-images auth upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-images public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-images');

CREATE POLICY "chat-images owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);
