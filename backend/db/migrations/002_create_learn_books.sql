-- Learn Books table: like projects but with an optional PDF indexed in Qdrant
CREATE TABLE IF NOT EXISTS learn_books (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  description          text,
  language             text        NOT NULL CHECK (language IN ('python', 'html')),
  code                 text        NOT NULL DEFAULT '',
  has_pdf              boolean     NOT NULL DEFAULT false,
  pdf_collection_name  text,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS learn_books_user_id_idx ON learn_books(user_id);

-- Row Level Security
ALTER TABLE learn_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own books"
  ON learn_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create books"
  ON learn_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
  ON learn_books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
  ON learn_books FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_learn_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER learn_books_updated_at_trigger
  BEFORE UPDATE ON learn_books
  FOR EACH ROW
  EXECUTE FUNCTION update_learn_books_updated_at();
