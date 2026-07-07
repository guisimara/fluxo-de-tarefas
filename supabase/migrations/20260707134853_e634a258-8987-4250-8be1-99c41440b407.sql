
REVOKE EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_project_role(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_role(UUID, UUID) TO authenticated;
