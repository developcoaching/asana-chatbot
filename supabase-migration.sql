-- Supabase Migration for Asana Coaching Assistant
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- TABLE: chat_sessions
-- Stores chat session metadata
-- ==========================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id TEXT,
    current_client TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- ==========================================
-- TABLE: chat_messages
-- Stores individual messages in conversations
-- ==========================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    client_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast message retrieval by session
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- Enable if you want to restrict access
-- ==========================================

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for backend)
CREATE POLICY "Service role full access to sessions" ON chat_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to messages" ON chat_messages
    FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- HELPFUL VIEWS
-- ==========================================

-- View: Recent sessions with message count
CREATE OR REPLACE VIEW recent_sessions AS
SELECT
    s.id,
    s.session_id,
    s.current_client,
    s.created_at,
    s.last_activity,
    COUNT(m.id) as message_count
FROM chat_sessions s
LEFT JOIN chat_messages m ON s.session_id = m.session_id
GROUP BY s.id, s.session_id, s.current_client, s.created_at, s.last_activity
ORDER BY s.last_activity DESC
LIMIT 50;

-- ==========================================
-- CLEANUP FUNCTION (Optional)
-- Delete sessions older than 30 days
-- ==========================================

CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_sessions
    WHERE last_activity < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- You can schedule this to run daily using Supabase cron or pg_cron
