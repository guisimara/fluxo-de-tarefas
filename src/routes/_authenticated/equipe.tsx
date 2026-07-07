import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMember, Project, Profile } from "@/lib/tasks";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/equipe")({
  component: TeamPage,
});

function TeamPage() {
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*");
      return (data ?? []) as Project[];
    },
  });
  const members = useQuery({
    queryKey: ["all-members"],
    queryFn: async () => {
      const { data } = await supabase.from("project_members").select("*");
      return (data ?? []) as ProjectMember[];
    },
  });
  const profiles = useQuery({
    queryKey: ["all-member-profiles", (members.data ?? []).map((m) => m.user_id).join(",")],
    enabled: (members.data ?? []).some((m) => m.user_id),
    queryFn: async () => {
      const ids = (members.data ?? []).map((m) => m.user_id).filter(Boolean) as string[];
      if (ids.length === 0) return [] as Profile[];
      const { data } = await supabase.from("profiles").select("id, name, email, avatar_url").in("id", ids);
      return (data ?? []) as Profile[];
    },
  });

  const projectName = (id: string) => projects.data?.find((p) => p.id === id)?.name ?? "—";

  // Group by email
  const groups = new Map<string, ProjectMember[]>();
  (members.data ?? []).forEach((m) => {
    const key = m.user_id ?? m.invited_email ?? "?";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground">Todos os colaboradores dos seus projetos.</p>
      </div>
      {groups.size === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum colaborador ainda. Convide alguém em um projeto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(groups.entries()).map(([key, list]) => {
            const first = list[0];
            const profile = profiles.data?.find((p) => p.id === first.user_id);
            const label = profile?.name || profile?.email || first.invited_email || "—";
            return (
              <div key={key} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{profile?.email ?? first.invited_email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {list.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <span>{projectName(m.project_id)} · <span className="text-muted-foreground">{m.role}</span></span>
                      <span className={m.status === "pending" ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700" : "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"}>
                        {m.status === "pending" ? "Pendente" : "Aceito"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}