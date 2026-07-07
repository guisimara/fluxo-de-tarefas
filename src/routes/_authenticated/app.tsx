import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskListView, TaskTimelineView } from "@/components/task-views";
import { TaskTree } from "@/components/task-tree";
import { TaskModal } from "@/components/task-modal";
import { InviteModal } from "@/components/invite-modal";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, List, KanbanSquare, GanttChartSquare, GitBranch } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useProjectScope } from "@/lib/project-scope";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Task, Project } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/app")({
  component: DashboardPage,
});

const VIEWS = [
  { id: "tree", label: "Árvore", icon: GitBranch },
  { id: "list", label: "Lista", icon: List },
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
] as const;
type ViewMode = (typeof VIEWS)[number]["id"];

function DashboardPage() {
  const { user } = useCurrentUser();
  const { scope } = useProjectScope();
  const isProjectScope = scope !== "all" && scope !== "personal";
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("kanban");
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", scope, user?.id],
    enabled: scope !== "personal" || !!user,
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (isProjectScope) q = q.eq("project_id", scope);
      else if (scope === "personal") q = q.eq("assignee_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const filtered = (tasks.data ?? []).filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (dateFilter !== "all") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const due = t.due_date ? new Date(t.due_date + "T00:00:00") : null;
      if (dateFilter === "sem_prazo" && due) return false;
      if (dateFilter === "atrasadas" && !(due && due < today)) return false;
      if (dateFilter === "hoje" && !(due && due.getTime() === today.getTime())) return false;
      if (dateFilter === "semana") {
        const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
        if (!(due && due >= today && due <= weekEnd)) return false;
      }
    }
    return true;
  });

  const openTask = (t: Task) => { setEditingTask(t); setParentTask(null); setTaskOpen(true); };
  const addSubtask = (parent: Task) => { setEditingTask(null); setParentTask(parent); setTaskOpen(true); };

  const topLevel = filtered.filter((t) => !t.parent_id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minhas Tarefas</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu trabalho.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefa..."
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda prioridade</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as datas</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Próximos 7 dias</SelectItem>
              <SelectItem value="atrasadas">Atrasadas</SelectItem>
              <SelectItem value="sem_prazo">Sem prazo</SelectItem>
            </SelectContent>
          </Select>
          {isProjectScope && (
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Convidar
            </Button>
          )}
          <Button onClick={() => { setEditingTask(null); setParentTask(null); setTaskOpen(true); }} disabled={(projects.data ?? []).length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      </div>

      {(projects.data ?? []).length > 0 && (
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
      )}

      <div className="mt-4">
        {(projects.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <h3 className="text-lg font-medium">Comece criando um projeto</h3>
            <p className="mt-1 text-sm text-muted-foreground">Você precisa de um projeto para começar a organizar suas tarefas.</p>
            <Button className="mt-4" asChild>
              <a href="/projetos">Criar meu primeiro projeto</a>
            </Button>
          </div>
        ) : view === "kanban" ? (
          <KanbanBoard
            tasks={topLevel}
            projects={projects.data ?? []}
            defaultProjectId={isProjectScope ? scope : undefined}
          />
        ) : view === "list" ? (
          <TaskListView tasks={topLevel} projects={projects.data ?? []} onOpen={openTask} />
        ) : view === "timeline" ? (
          <TaskTimelineView tasks={topLevel} projects={projects.data ?? []} onOpen={openTask} />
        ) : (
          <TaskTree tasks={filtered} projects={projects.data ?? []} onOpen={openTask} onAddSubtask={addSubtask} />
        )}
      </div>

      <TaskModal
        open={taskOpen}
        onOpenChange={(v) => { setTaskOpen(v); if (!v) { setEditingTask(null); setParentTask(null); } }}
        task={editingTask}
        parentTask={parentTask}
        onAddSubtask={addSubtask}
        projects={projects.data ?? []}
        defaultProjectId={isProjectScope ? scope : undefined}
      />
      {isProjectScope && (
        <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} projectId={scope} />
      )}
    </div>
  );
}