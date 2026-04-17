-- Migration: add item_vectors table and helper RPC for vector search
-- Requires the pgvector extension

-- enable pgvector (run as a privileged role)
CREATE EXTENSION IF NOT EXISTS vector;

-- item_vectors stores a single vector per item_id (you can extend to multiple images per item if needed)
CREATE TABLE IF NOT EXISTS item_vectors (
  -- Ensure this column type matches the `items.id` column type. The DB reported
  -- `items.id` is bigint, so use bigint here. If your items.id is uuid, change back to uuid.
  item_id bigint PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  embedding vector(3072) NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create an RPC function to match embeddings using <-> (L2 distance). Returns item_id and distance
CREATE OR REPLACE FUNCTION public.match_item_vectors(query_embedding vector, limit_count int)
RETURNS TABLE(item_id bigint, distance float)
LANGUAGE SQL
AS $$
  SELECT item_id, (embedding <-> query_embedding) AS distance
  FROM item_vectors
  ORDER BY embedding <-> query_embedding
  LIMIT limit_count;
$$;

-- Wrapper overload to accommodate PostgREST / Supabase which may search by parameter
-- name ordering. Some clients (and the schema cache) expect the parameters in a different
-- order; provide an overload that accepts (limit_count, query_embedding) to ensure
-- the RPC is discoverable regardless of ordering chosen by the REST layer.
CREATE OR REPLACE FUNCTION public.match_item_vectors(limit_count int, query_embedding vector)
RETURNS TABLE(item_id bigint, distance float)
LANGUAGE SQL
AS $$
  SELECT item_id, (embedding <-> query_embedding) AS distance
  FROM item_vectors
  ORDER BY embedding <-> query_embedding
  LIMIT limit_count;
$$;

-- Additionally provide a uniquely-named RPC to avoid overload ambiguity when calling
-- via PostgREST / supabase-js RPC. Some clients have trouble resolving overloaded
-- functions; this provides a single unambiguous entrypoint.
CREATE OR REPLACE FUNCTION public.match_item_vectors_v1(query_embedding vector, limit_count int)
RETURNS TABLE(item_id bigint, distance float)
LANGUAGE SQL
AS $$
  SELECT item_id, (embedding <-> query_embedding) AS distance
  FROM item_vectors
  ORDER BY embedding <-> query_embedding
  LIMIT limit_count;
$$;
