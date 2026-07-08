import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Pencil, Copy, Trash2, FolderInput } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Task, Project } from "@/lib/tasks";

async function nextPosition(projectId: string, parentId: string | null) {
  let q = supabase.from("tasks").select("position").eq("project_id", projectId).order("position", { ascending: false }).limit(1);
  q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
  const { data } = await q;
  return (data?.[0]?.position ?? -1) + 1;
}

export function useDuplicateTask() {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({ task, targetProjectId }: { task: Task; targetProjectId?: string }) => {
      if (!user) throw new Error("Sessão expirada, faça login novamente.");
      const project_id = targetProjectId ?? task.project_id;
      const position = await nextPosition(project_id, task.parent_id);
      const { error } = await supabase.from("tasks").insert({
        title: `${task.title} (cópia)`,
        description: task.description,
        project_id,
        parent_id: task.parent_id,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        assignee_id: null,
        tags: task.tags,
        position,
        recurrence: task.recurrence as never,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa duplicada");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa excluída");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Menu de edição rápida (botão direito) para uma tarefa: editar, duplicar (opcionalmente em outro projeto) e excluir. */
export function TaskContextMenu({
  task,
  projects,
  onEdit,
  children,
}: {
  task: Task;
  projects: Project[];
  onEdit: () => void;
  children: ReactNode;
}) {
  const duplicate = useDuplicateTask();
  const del = useDeleteTask();
  const otherProjects = projects.filter((p) => p.id !== task.project_id);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={onEdit} className="gap-2">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => duplicate.mutate({ task })} className="gap-2">
          <Copy className="h-3.5 w-3.5" /> Duplicar
        </ContextMenuItem>
        {otherProjects.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <FolderInput className="h-3.5 w-3.5" /> Duplicar em...
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {otherProjects.map((p) => (
                <ContextMenuItem key={p.id} onSelect={() => duplicate.mutate({ task, targetProjectId: p.id })} className="gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => { if (confirm("Excluir esta tarefa?")) del.mutate(task); }}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Menu de edição rápida (botão direito) para um projeto: editar, duplicar e excluir. */
export function ProjectContextMenu({
  project,
  onEdit,
  onDelete,
  children,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const duplicate = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada, faça login novamente.");
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: `${project.name} (cópia)`,
          description: project.description,
          color: project.color,
          owner_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const { data: tasks } = await supabase.from("tasks").select("*").eq("project_id", project.id).is("parent_id", null);
      if (tasks && tasks.length > 0) {
        const { error: tasksError } = await supabase.from("tasks").insert(
          tasks.map((t) => ({
            title: t.title,
            description: t.description,
            project_id: data.id,
            status: t.status,
            priority: t.priority,
            due_date: t.due_date,
            tags: t.tags,
            position: t.position,
            recurrence: t.recurrence,
            created_by: user.id,
          })),
        );
        if (tasksError) throw tasksError;
      }
    },
    onSuccess: () => {
      toast.success("Projeto duplicado");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={onEdit} className="gap-2">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => duplicate.mutate()} className="gap-2">
          <Copy className="h-3.5 w-3.5" /> Duplicar
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onDelete} className="gap-2 text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
