-- Create qa_pairs table for storing predefined Q&A
CREATE TABLE public.qa_pairs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  observation_content text,
  interpretation_content text,
  actionable_content text,
  keywords text[] NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qa_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Q&A pairs"
  ON public.qa_pairs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Q&A pairs"
  ON public.qa_pairs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Q&A pairs"
  ON public.qa_pairs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Q&A pairs"
  ON public.qa_pairs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for keyword search
CREATE INDEX idx_qa_pairs_keywords ON public.qa_pairs USING GIN (keywords);

-- Insert the two existing Q&A pairs as examples (will be owned by first user who runs this)
-- Note: This is just for reference, actual data should be added via the UI