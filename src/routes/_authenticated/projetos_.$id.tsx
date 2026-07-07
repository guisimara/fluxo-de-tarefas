import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { StatusSummary } from "@/components/status-summary";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskTree } from "@/components/task-tree";
import { TaskModal } from "@/components/task-modal";
import { InviteModal } from "@/components/invite-modal";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, ArrowLeft, Users, KanbanSquare, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Project, ProjectMember, Profile } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/projetos_/$id")({
  component: ProjectPage,
});

const VIEWS = [
  { id: "tree", label: "Árvore", icon: GitBranch },
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
] as const;
type ViewMode = (typeof VIEWS)[number]["id"];

function ProjectPage() {
  const { id } = Route.useParams();
  const [taskOpen, setTaskOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [view, setView] = useState<ViewMode>("kanban");

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const members = useQuery({
    queryKey: ["members", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_members").select("*").eq("project_id", id);
      if (error) throw error;
      return (data ?? []) as ProjectMember[];
    },
  });

  const memberProfiles = useQuery({
    queryKey: ["member-profiles", id, (members.data ?? []).map((m) => m.user_id).join(",")],
    enabled: (members.data ?? []).some((m) => m.user_id),
    queryFn: async () => {
      const ids = (members.data ?? []).map((m) => m.user_id).filter(Boolean) as string[];
      if (ids.length === 0) return [] as Profile[];
      const { data } = await supabase.from("profiles").select("id, name, email, avatar_url").in("id", ids);
      return (data ?? []) as Profile[];
    },
  });

  if (!project.data) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const openTask = (t: Task) => { setEditingTask(t); setParentTask(null); setTaskOpen(true); };
  const addSubtask = (parent: Task) => { setEditingTask(null); setParentTask(parent); setTaskOpen(true); };
  const topLevel = (tasks.data ?? []).filter((t) => !t.parent_id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <Link to="/projetos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Projetos
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.data.name}</h1>
          {project.data.description && <p className="text-sm text-muted-foreground">{project.data.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Convidar
          </Button>
          <Button onClick={() => { setEditingTask(null); setParentTask(null); setTaskOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      </div>

      <StatusSummary tasks={tasks.data ?? []} />

      <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
              view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <v.icon className="h-4 w-4" /> {v.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {view === "kanban" ? (
          <KanbanBoard tasks={topLevel} projects={[project.data]} defaultProjectId={project.data.id} />
        ) : (
          <TaskTree tasks={tasks.data ?? []} projects={[project.data]} onOpen={openTask} onAddSubtask={addSubtask} />
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Colaboradores</h2>
        </div>
        <div className="space-y-2">
          {(members.data ?? []).length === 0 && <div className="text-sm text-muted-foreground">Nenhum colaborador ainda.</div>}
          {(members.data ?? []).map((m) => {
            const profile = (memberProfiles.data ?? []).find((p) => p.id === m.user_id);
            const label = profile?.name || profile?.email || m.invited_email || "—";
            return (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{m.role} · {m.status === "pending" ? "Pendente" : "Aceito"}</div>
                </div>
                <span className={m.status === "pending" ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700" : "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"}>
                  {m.status === "pending" ? "Pendente" : "Aceito"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <TaskModal
        open={taskOpen}
        onOpenChange={(v) => { setTaskOpen(v); if (!v) { setEditingTask(null); setParentTask(null); } }}
        task={editingTask}
        parentTask={parentTask}
        onAddSubtask={addSubtask}
        projects={[project.data]}
        defaultProjectId={project.data.id}
      />
      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} projectId={project.data.id} />
    </div>
  );
}