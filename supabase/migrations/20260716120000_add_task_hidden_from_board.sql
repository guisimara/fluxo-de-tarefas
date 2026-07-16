ALTER TABLE public.tasks
  ADD COLUMN hidden_from_board boolean NOT NULL DEFAULT false;
