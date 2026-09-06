-- 1. HOSTS TABLE: Stores authorization references
CREATE TABLE hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    google_refresh_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. EVENTS TABLE: Configures target collection pathways
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_slug TEXT UNIQUE NOT NULL,
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE NOT NULL,
    google_folder_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX idx_events_slug ON events(qr_slug);

-- 3. MEDIA TABLE: Caches lightweight visual references for the live gallery
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    google_file_id TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    view_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX idx_media_event_timeline ON media(event_id, created_at DESC);
