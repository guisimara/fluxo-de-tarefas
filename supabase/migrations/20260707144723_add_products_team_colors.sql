
-- ===================== projects.color =====================
ALTER TABLE public.projects ADD COLUMN color TEXT NOT NULL DEFAULT '#3B82F6';

-- ===================== products =====================
-- A "product" is a lightweight registry entry that owns exactly one linked project
-- (created automatically) so the user can generate tasks/lists for it right away.
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_project_idx ON public.products(project_id);
CREATE INDEX products_owner_idx ON public.products(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "products_select_member" ON public.products
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "products_insert_own" ON public.products
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "products_update_owner_admin" ON public.products
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.get_project_role(project_id, auth.uid()) = 'admin')
  WITH CHECK (owner_id = auth.uid() OR public.get_project_role(project_id, auth.uid()) = 'admin');
CREATE POLICY "products_delete_owner" ON public.products
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ===================== team_members (org-wide roster) =====================
CREATE TYPE public.org_role AS ENUM ('admin','gestor','lider','operacional');

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_email TEXT NOT NULL,
  name TEXT,
  role public.org_role NOT NULL DEFAULT 'operacional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX team_members_owner_email_idx ON public.team_members(owner_id, invited_email);
CREATE INDEX team_members_user_idx ON public.team_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "team_members_select_own" ON public.team_members
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "team_members_insert_own" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "team_members_update_own" ON public.team_members
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "team_members_delete_own" ON public.team_members
  FOR DELETE TO authenticated USING (owner_id = auth.uid());
