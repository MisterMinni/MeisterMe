
DROP POLICY IF EXISTS "chat-images public read" ON storage.objects;
CREATE POLICY "chat-images auth read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-images');
