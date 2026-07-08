import { useState } from "react";
import { ChevronRight, Plus, Inbox, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  STATUS_LABEL,
  STATUS_TOKEN,
  PRIORITY_LABEL,
  PRIORITY_CLASS,
  buildTaskTree,
  sortTasksDefault,
  type Task,
  type TaskNode,
  type Project,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { useToggleTaskDone, StatusDot } from "./task-views";
import { TaskContextMenu } from "./task-context-menu";
import { useCurrentUser } from "@/hooks/use-current-user";

/** Persiste a nova ordem de um grupo de irmãos (mesmo parent_id) após um drag-and-drop. */
function useReorderSiblings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: Task[]) => {
      await Promise.all(
        ordered.map((t, index) =>
          t.position === index ? Promise.resolve() : supabase.from("tasks").update({ position: index }).eq("id", t.id),
        ),
      );
    },
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      const positionById = new Map(ordered.map((t, index) => [t.id, index]));
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old ? old.map((t) => (positionById.has(t.id) ? { ...t, position: positionById.get(t.id)! } : t)) : old,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous.forEach(([k, v]) => qc.setQueryData(k, v)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

function TreeNode({
  node,
  project,
  projects,
  depth,
  onOpen,
  onAddSubtask,
}: {
  node: TaskNode;
  project?: Project;
  projects: Project[];
  depth: number;
  onOpen: (t: Task) => void;
  onAddSubtask: (parent: Task) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const token = STATUS_TOKEN[node.status];
  const hasChildren = node.children.length > 0;
  const toggleDone = useToggleTaskDone();
  const reorder = useReorderSiblings();
  const children = sortTasksDefault(node.children) as TaskNode[];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const onChildDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = children.findIndex((c) => c.id === e.active.id);
    const newIndex = children.findIndex((c) => c.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorder.mutate(arrayMove(children, oldIndex, newIndex));
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-10 opacity-60")}>
      {depth > 0 && (
        <>
          <span className="absolute -left-4 top-0 h-5 w-4 border-b border-l border-border" />
          <span className="absolute -left-4 top-5 bottom-0 w-px bg-border" />
        </>
      )}
      <TaskContextMenu task={node} projects={projects} onEdit={() => onOpen(node)}>
        <div className="group flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 hover:bg-accent/40">
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className={cn("grid h-5 w-5 shrink-0 place-items-center rounded transition", !hasChildren && "invisible")}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition", expanded && "rotate-90")} />
          </button>

          <StatusDot task={node} onToggle={(e) => { e.stopPropagation(); toggleDone.mutate(node); }} />

          <button onClick={() => onOpen(node)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="truncate text-sm">{node.title}</span>
            {project && depth === 0 && (
              <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.color }} /> {project.name}
              </span>
            )}
            <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px]", token.bg, token.fg)}>{STATUS_LABEL[node.status]}</span>
            <span className={cn("hidden shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] sm:inline", PRIORITY_CLASS[node.priority])}>
              {PRIORITY_LABEL[node.priority]}
            </span>
            {node.recurrence && <span className="shrink-0 text-[11px] text-muted-foreground" title="Tarefa recorrente">↻</span>}
            {hasChildren && <span className="shrink-0 text-[11px] text-muted-foreground">{node.children.length} subtarefa{node.children.length > 1 ? "s" : ""}</span>}
          </button>

          <button
            onClick={() => onAddSubtask(node)}
            className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
            title="Adicionar subtarefa"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </TaskContextMenu>

      {expanded && hasChildren && (
        <div className="ml-6 space-y-0.5 border-l border-transparent pl-4">
          <DndContext sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))} onDragEnd={onChildDragEnd}>
            <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {children.map((child) => (
                <TreeNode key={child.id} node={child} project={project} projects={projects} depth={depth + 1} onOpen={onOpen} onAddSubtask={onAddSubtask} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function QuickAddRow({ projects, defaultProjectId }: { projects: Project[]; defaultProjectId?: string }) {
  const [title, setTitle] = useState("");
  const { user } = useCurrentUser();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada, faça login novamente.");
      const projectId = defaultProjectId ?? projects[0]?.id;
      if (!projectId) throw new Error("Crie um projeto primeiro.");
      const { data: last } = await supabase
        .from("tasks")
        .select("position")
        .eq("project_id", projectId)
        .is("parent_id", null)
        .order("position", { ascending: false })
        .limit(1);
      const position = (last?.[0]?.position ?? -1) + 1;
      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        project_id: projectId,
        status: "aberto",
        priority: "media",
        created_by: user.id,
        position,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2">
      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) { e.preventDefault(); create.mutate(); }
        }}
        placeholder="Adicionar tarefa rápida e pressionar Enter..."
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function TaskTree({
  tasks,
  projects,
  onOpen,
  onAddSubtask,
  defaultProjectId,
}: {
  tasks: Task[];
  projects: Project[];
  onOpen: (t: Task) => void;
  onAddSubtask: (parent: Task) => void;
  defaultProjectId?: string;
}) {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const tree = buildTaskTree(tasks);
  const roots = sortTasksDefault(tree) as TaskNode[];
  const reorder = useReorderSiblings();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = roots.findIndex((r) => r.id === e.active.id);
    const newIndex = roots.findIndex((r) => r.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorder.mutate(arrayMove(roots, oldIndex, newIndex));
  };

  return (
    <div>
      <QuickAddRow projects={projects} defaultProjectId={defaultProjectId} />

      {roots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Nenhuma tarefa</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie uma tarefa para começar a montar a árvore.</p>
        </div>
      ) : (
        <div className="space-y-1 rounded-2xl border border-border bg-card p-4">
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={roots.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {roots.map((node) => (
                <TreeNode key={node.id} node={node} project={projectById.get(node.project_id)} projects={projects} depth={0} onOpen={onOpen} onAddSubtask={onAddSubtask} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
