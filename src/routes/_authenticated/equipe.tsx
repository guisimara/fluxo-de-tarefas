import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Trash2, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ORG_ROLE_LABEL, type OrgRole, type TeamMember, type Project, type ProjectMember } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/equipe")({
  component: TeamPage,
});

const ORG_ROLE_CLASS: Record<OrgRole, string> = {
  admin: "bg-rose-50 text-rose-700 border-rose-200",
  gestor: "bg-violet-50 text-violet-700 border-violet-200",
  lider: "bg-blue-50 text-blue-700 border-blue-200",
  operacional: "bg-slate-50 text-slate-700 border-slate-200",
};

function TeamPage() {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("operacional");

  const team = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const access = useQuery({
    queryKey: ["all-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_members").select("*");
      if (error) throw error;
      return (data ?? []) as ProjectMember[];
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error();
      const { error } = await supabase.from("team_members").insert({
        owner_id: user.id,
        invited_email: email,
        name: name || null,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro adicionado");
      qc.invalidateQueries({ queryKey: ["team-members"] });
      setOpen(false); setName(""); setEmail(""); setRole("operacional");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: OrgRole }) => {
      const { error } = await supabase.from("team_members").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  });

  const grantAccess = useMutation({
    mutationFn: async ({ member, project }: { member: TeamMember; project: Project }) => {
      const { error } = await supabase.from("project_members").insert({
        project_id: project.id,
        invited_email: member.invited_email,
        user_id: member.user_id,
        role: "editor",
        status: member.user_id ? "accepted" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-members"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeAccess = useMutation({
    mutationFn: async ({ memberId, projectId }: { memberId: string; projectId: string }) => {
      const { error } = await supabase.from("project_members").delete().eq("id", memberId).eq("project_id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-members"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });

  const accessFor = (member: TeamMember, projectId: string) =>
    (access.data ?? []).find(
      (a) => a.project_id === projectId && (a.invited_email === member.invited_email || (member.user_id && a.user_id === member.user_id)),
    );

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 md:px-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground">Cadastre colaboradores, defina papéis e libere acesso a projetos.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo membro
        </Button>
      </div>

      {(team.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Nenhum membro ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro colaborador da equipe.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(team.data ?? []).map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{m.name || m.invited_email}</div>
                  <div className="text-xs text-muted-foreground">{m.invited_email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={m.role} onValueChange={(v) => updateRole.mutate({ id: m.id, role: v as OrgRole })}>
                    <SelectTrigger className={cn("w-[140px] border", ORG_ROLE_CLASS[m.role])}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ORG_ROLE_LABEL) as OrgRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{ORG_ROLE_LABEL[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button onClick={() => { if (confirm("Remover este membro?")) removeMember.mutate(m.id); }}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>

              {(projects.data ?? []).length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5" /> Acesso a projetos
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(projects.data ?? []).map((p) => {
                      const grant = accessFor(m, p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => grant ? revokeAccess.mutate({ memberId: grant.id, projectId: p.id }) : grantAccess.mutate({ member: m, project: p })}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition",
                            grant ? "border-transparent text-white" : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                          )}
                          style={grant ? { background: p.color } : undefined}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo membro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ana Souza" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" /></div>
            <div>
              <Label className="mb-2 block">Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ORG_ROLE_LABEL) as OrgRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ORG_ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMember.mutate()} disabled={!email.trim()}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
