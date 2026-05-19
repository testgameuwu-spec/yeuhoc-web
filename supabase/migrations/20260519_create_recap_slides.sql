-- Create table for Recap Slides
CREATE TABLE public.recap_slides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_index INTEGER NOT NULL DEFAULT 0,
    slide_type TEXT NOT NULL DEFAULT 'text',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.recap_slides ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on recap_slides" ON public.recap_slides
    FOR SELECT TO public USING (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access on recap_slides" ON public.recap_slides
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Create bucket for recap images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recap_images', 'recap_images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for bucket
CREATE POLICY "Allow public read access on recap_images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'recap_images');

CREATE POLICY "Allow admin upload to recap_images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'recap_images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow admin update to recap_images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'recap_images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow admin delete from recap_images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'recap_images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
