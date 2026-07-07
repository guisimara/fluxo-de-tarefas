import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { StatusSummary } from "@/components/status-summary";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskModal } from "@/components/task-modal";
import { InviteModal } from "@/components/invite-modal";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, Project } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/app")({
  component: DashboardPage,
});

function DashboardPage() {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [taskOpen, setTaskOpen] = useState(false);
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
    queryKey: ["tasks", projectFilter],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const filtered = (tasks.data ?? []).filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

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
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {(projects.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {projectFilter !== "all" && (
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Convidar
            </Button>
          )}
          <Button onClick={() => setTaskOpen(true)} disabled={(projects.data ?? []).length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      </div>

      <StatusSummary tasks={filtered} />

      <div className="mt-6">
        {(projects.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <h3 className="text-lg font-medium">Comece criando um projeto</h3>
            <p className="mt-1 text-sm text-muted-foreground">Você precisa de um projeto para começar a organizar suas tarefas.</p>
            <Button className="mt-4" asChild>
              <a href="/app/projetos">Criar meu primeiro projeto</a>
            </Button>
          </div>
        ) : (
          <KanbanBoard
            tasks={filtered}
            projects={projects.data ?? []}
            defaultProjectId={projectFilter !== "all" ? projectFilter : undefined}
          />
        )}
      </div>

      <TaskModal
        open={taskOpen}
        onOpenChange={setTaskOpen}
        projects={projects.data ?? []}
        defaultProjectId={projectFilter !== "all" ? projectFilter : undefined}
      />
      {projectFilter !== "all" && (
        <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} projectId={projectFilter} />
      )}
    </div>
  );
}