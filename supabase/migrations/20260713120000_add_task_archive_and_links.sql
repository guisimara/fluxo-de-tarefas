ALTER TABLE public.tasks
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN links jsonb NOT NULL DEFAULT '[]'::jsonb;
