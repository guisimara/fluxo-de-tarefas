
-- The original "members_select_of_project" policy queried auth.users directly to
-- resolve the caller's email, which the authenticated role has no privilege to read.
-- That makes any RLS check touching this policy fail with a permission error
-- (surfaced to PostgREST clients as 403), including plain `select *` scans.
-- auth.jwt() ->> 'email' reads the same value from the caller's JWT with no table access needed.
DROP POLICY IF EXISTS "members_select_of_project" ON public.project_members;
CREATE POLICY "members_select_of_project" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    public.is_project_member(project_id, auth.uid())
    OR invited_email = (auth.jwt() ->> 'email')
  );
