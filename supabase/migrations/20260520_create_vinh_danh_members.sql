-- Create table for Vinh Danh Members
CREATE TABLE IF NOT EXISTS public.vinh_danh_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    photo_url TEXT,
    achievements TEXT NOT NULL DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.vinh_danh_members ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on vinh_danh_members" ON public.vinh_danh_members
    FOR SELECT TO public USING (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access on vinh_danh_members" ON public.vinh_danh_members
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
