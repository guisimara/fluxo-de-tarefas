ALTER TABLE public.tasks
  ADD COLUMN parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX tasks_parent_idx ON public.tasks(parent_id);
