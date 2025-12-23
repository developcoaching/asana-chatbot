-- Phase 15.1: Training Knowledge Base Schema
-- Run this in Supabase SQL Editor

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create training_knowledge table
CREATE TABLE IF NOT EXISTS training_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(filename, chunk_index)
);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS training_knowledge_embedding_idx
ON training_knowledge
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for filename lookups
CREATE INDEX IF NOT EXISTS training_knowledge_filename_idx
ON training_knowledge(filename);

-- Create index for metadata queries (category, etc.)
CREATE INDEX IF NOT EXISTS training_knowledge_metadata_idx
ON training_knowledge USING gin(metadata);

-- Function for semantic search
CREATE OR REPLACE FUNCTION search_training(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 3,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tk.id,
    tk.filename,
    tk.chunk_index,
    tk.content,
    tk.metadata,
    1 - (tk.embedding <=> query_embedding) AS similarity
  FROM training_knowledge tk
  WHERE
    CASE
      WHEN filter_category IS NOT NULL
      THEN tk.metadata->>'category' = filter_category
      ELSE TRUE
    END
  ORDER BY tk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Verify setup
SELECT 'training_knowledge table created successfully' AS status;
