-- Asana Mirror Table for Supabase-First Retrieval
-- This table mirrors Asana comments for fast, reliable access

-- Drop existing table if recreating
DROP TABLE IF EXISTS asana_mirror;

-- Create the main mirror table
CREATE TABLE asana_mirror (
    -- Primary identifier
    comment_gid TEXT PRIMARY KEY,

    -- Task context
    task_gid TEXT NOT NULL,
    task_name TEXT NOT NULL,
    section_name TEXT,
    project_name TEXT DEFAULT 'Progress',

    -- Client context
    client_name TEXT NOT NULL,
    team_gid TEXT,

    -- Author information
    author_name TEXT,
    author_gid TEXT,
    raw_author_data JSONB,

    -- Intelligence flags
    coach_inferred BOOLEAN DEFAULT FALSE,
    is_coach_comment BOOLEAN DEFAULT FALSE,

    -- Comment content
    comment_text TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for fast queries
    CONSTRAINT valid_comment CHECK (comment_text IS NOT NULL AND comment_text != '')
);

-- Create indexes for common query patterns
CREATE INDEX idx_asana_mirror_client ON asana_mirror(client_name);
CREATE INDEX idx_asana_mirror_task ON asana_mirror(task_gid);
CREATE INDEX idx_asana_mirror_author ON asana_mirror(author_name);
CREATE INDEX idx_asana_mirror_author_gid ON asana_mirror(author_gid);
CREATE INDEX idx_asana_mirror_created ON asana_mirror(created_at DESC);
CREATE INDEX idx_asana_mirror_client_created ON asana_mirror(client_name, created_at DESC);
CREATE INDEX idx_asana_mirror_coach ON asana_mirror(is_coach_comment) WHERE is_coach_comment = TRUE;

-- Create a view for easy coach comment access
CREATE OR REPLACE VIEW coach_comments AS
SELECT
    comment_gid,
    client_name,
    task_name,
    section_name,
    author_name,
    author_gid,
    coach_inferred,
    comment_text,
    created_at
FROM asana_mirror
WHERE is_coach_comment = TRUE OR coach_inferred = TRUE
ORDER BY created_at DESC;

-- Create a sync log table
CREATE TABLE IF NOT EXISTS asana_sync_log (
    id SERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    sync_type TEXT DEFAULT 'full',
    comments_found INTEGER,
    comments_inserted INTEGER,
    comments_updated INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',
    error_message TEXT
);

-- Grant permissions
GRANT ALL ON asana_mirror TO authenticated;
GRANT ALL ON asana_mirror TO anon;
GRANT ALL ON asana_sync_log TO authenticated;
GRANT ALL ON asana_sync_log TO anon;

-- Verification query
SELECT 'asana_mirror table created successfully' AS status;
