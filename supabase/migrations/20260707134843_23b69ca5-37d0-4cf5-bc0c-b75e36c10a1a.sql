
-- Enums
CREATE TYPE public.task_status AS ENUM ('aberto','pendente','para_produzir','em_andamento','concluido');
CREATE TYPE public.task_priority AS ENUM ('baixa','media','alta');
CREATE TYPE public.member_role AS ENUM ('admin','editor','viewer');
CREATE TYPE public.member_status AS ENUM ('pending','accepted');

-- Update timestamp helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===================== profiles =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== projects =====================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== project_members =====================
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT,
  role public.member_role NOT NULL DEFAULT 'editor',
  status public.member_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX project_members_project_idx ON public.project_members(project_id);
CREATE INDEX project_members_user_idx ON public.project_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id AND m.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_project_role(_project_id UUID, _user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id) THEN 'admin'
    ELSE (SELECT role::text FROM public.project_members
          WHERE project_id = _project_id AND user_id = _user_id AND status = 'accepted' LIMIT 1)
  END;
$$;

-- Projects policies
CREATE POLICY "projects_select_member" ON public.projects
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_project_member(id, auth.uid()));
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "projects_update_owner_admin" ON public.projects
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.get_project_role(id, auth.uid()) = 'admin')
  WITH CHECK (owner_id = auth.uid() OR public.get_project_role(id, auth.uid()) = 'admin');
CREATE POLICY "projects_delete_owner" ON public.projects
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Members policies
CREATE POLICY "members_select_of_project" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    public.is_project_member(project_id, auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
CREATE POLICY "members_insert_owner_admin" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
    OR public.get_project_role(project_id, auth.uid()) = 'admin'
  );
CREATE POLICY "members_update_self_or_admin" ON public.project_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
    OR public.get_project_role(project_id, auth.uid()) = 'admin'
  );
CREATE POLICY "members_delete_owner_admin" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
    OR public.get_project_role(project_id, auth.uid()) = 'admin'
    OR user_id = auth.uid()
  );

-- ===================== tasks =====================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'aberto',
  priority public.task_priority NOT NULL DEFAULT 'media',
  due_date DATE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tasks_project_idx ON public.tasks(project_id);
CREATE INDEX tasks_assignee_idx ON public.tasks(assignee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "tasks_select_member" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "tasks_insert_editor" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_project_role(project_id, auth.uid()) IN ('admin','editor')
    AND created_by = auth.uid()
  );
CREATE POLICY "tasks_update_editor" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.get_project_role(project_id, auth.uid()) IN ('admin','editor'))
  WITH CHECK (public.get_project_role(project_id, auth.uid()) IN ('admin','editor'));
CREATE POLICY "tasks_delete_editor" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.get_project_role(project_id, auth.uid()) IN ('admin','editor'));

-- ===================== task_comments =====================
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX task_comments_task_idx ON public.task_comments(task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_member" ON public.task_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
  ));
CREATE POLICY "comments_insert_member" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid()))
  );
CREATE POLICY "comments_delete_own" ON public.task_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());
