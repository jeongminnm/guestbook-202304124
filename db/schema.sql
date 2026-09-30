CREATE TABLE IF NOT EXISTS guestbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guestbook_entries_created_at_idx
  ON guestbook_entries (created_at DESC);