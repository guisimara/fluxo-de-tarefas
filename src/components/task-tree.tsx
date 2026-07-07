import { useState } from "react";
import { ChevronRight, Plus, Inbox } from "lucide-react";
import { STATUS_LABEL, STATUS_TOKEN, PRIORITY_LABEL, PRIORITY_CLASS, buildTaskTree, sortTasksPriorityThenDate, type Task, type TaskNode, type Project } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { useToggleTaskDone, StatusDot } from "./task-views";

function TreeNode({
  node,
  project,
  depth,
  onOpen,
  onAddSubtask,
}: {
  node: TaskNode;
  project?: Project;
  depth: number;
  onOpen: (t: Task) => void;
  onAddSubtask: (parent: Task) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const token = STATUS_TOKEN[node.status];
  const hasChildren = node.children.length > 0;
  const toggleDone = useToggleTaskDone();
  const children = sortTasksPriorityThenDate(node.children) as TaskNode[];

  return (
    <div className="relative">
      {depth > 0 && (
        <>
          <span className="absolute -left-4 top-0 h-5 w-4 border-b border-l border-border" />
          <span className="absolute -left-4 top-5 bottom-0 w-px bg-border" />
        </>
      )}
      <div className="group flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 hover:bg-accent/40">
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

      {expanded && hasChildren && (
        <div className="ml-6 space-y-0.5 border-l border-transparent pl-4">
          {children.map((child) => (
            <TreeNode key={child.id} node={child} project={project} depth={depth + 1} onOpen={onOpen} onAddSubtask={onAddSubtask} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskTree({
  tasks,
  projects,
  onOpen,
  onAddSubtask,
}: {
  tasks: Task[];
  projects: Project[];
  onOpen: (t: Task) => void;
  onAddSubtask: (parent: Task) => void;
}) {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const tree = buildTaskTree(tasks);
  const roots = sortTasksPriorityThenDate(tree) as TaskNode[];

  if (roots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-medium">Nenhuma tarefa</h3>
        <p className="mt-1 text-sm text-muted-foreground">Crie uma tarefa para começar a montar a árvore.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-2xl border border-border bg-card p-4">
      {roots.map((node) => (
        <TreeNode key={node.id} node={node} project={projectById.get(node.project_id)} depth={0} onOpen={onOpen} onAddSubtask={onAddSubtask} />
      ))}
    </div>
  );
}
