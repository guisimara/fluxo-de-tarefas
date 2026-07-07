-- ===================== task_members =====================
CREATE TABLE public.task_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);
CREATE INDEX task_members_task_idx ON public.task_members(task_id);
CREATE INDEX task_members_user_idx ON public.task_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_members TO authenticated;
GRANT ALL ON public.task_members TO service_role;
ALTER TABLE public.task_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_members_select_project_member" ON public.task_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
  ));
CREATE POLICY "task_members_insert_editor" ON public.task_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.get_project_role(t.project_id, auth.uid()) IN ('admin','editor')
  ));
CREATE POLICY "task_members_delete_editor" ON public.task_members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.get_project_role(t.project_id, auth.uid()) IN ('admin','editor')
  ));

-- ===================== products: multiple sales platforms =====================
ALTER TABLE public.products ADD COLUMN sales_platforms public.sales_platform[] NOT NULL DEFAULT '{}';
UPDATE public.products SET sales_platforms = ARRAY[sales_platform] WHERE sales_platform IS NOT NULL;
ALTER TABLE public.products DROP COLUMN sales_platform;
