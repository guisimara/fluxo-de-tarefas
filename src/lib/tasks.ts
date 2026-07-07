export const STATUS_ORDER = ["aberto", "pendente", "para_produzir", "em_andamento", "concluido"] as const;
export type Status = typeof STATUS_ORDER[number];

export const STATUS_LABEL: Record<Status, string> = {
  aberto: "Aberto",
  pendente: "Pendente",
  para_produzir: "Para Produzir",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

export const STATUS_TOKEN: Record<Status, { bg: string; fg: string; dot: string; dotBorder: string }> = {
  aberto: { bg: "bg-status-open", fg: "text-status-open-fg", dot: "bg-[#60A5FA]", dotBorder: "border-[#60A5FA]" },
  pendente: { bg: "bg-status-pending", fg: "text-status-pending-fg", dot: "bg-[#FBBF24]", dotBorder: "border-[#FBBF24]" },
  para_produzir: { bg: "bg-status-produce", fg: "text-status-produce-fg", dot: "bg-[#C084FC]", dotBorder: "border-[#C084FC]" },
  em_andamento: { bg: "bg-status-progress", fg: "text-status-progress-fg", dot: "bg-[#FB923C]", dotBorder: "border-[#FB923C]" },
  concluido: { bg: "bg-status-done", fg: "text-status-done-fg", dot: "bg-[#4ADE80]", dotBorder: "border-[#4ADE80]" },
};

export const PRIORITY_LABEL = { baixa: "Baixa", media: "Média", alta: "Alta" } as const;
export const PRIORITY_CLASS: Record<"baixa" | "media" | "alta", string> = {
  baixa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  media: "bg-amber-50 text-amber-700 border-amber-200",
  alta: "bg-rose-50 text-rose-700 border-rose-200",
};

export type Priority = "baixa" | "media" | "alta";

export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  assignee_id: string | null;
  created_by: string;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskNode extends Task {
  children: TaskNode[];
}

export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const nodes = new Map<string, TaskNode>(tasks.map((t) => [t.id, { ...t, children: [] }]));
  const roots: TaskNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: "admin" | "editor" | "viewer";
  status: "pending" | "accepted";
  created_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface TaskMember {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
}

export type ProductStatus = "em_construcao" | "ativo";
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  em_construcao: "Em construção",
  ativo: "Ativo",
};

export type SalesPlatform = "hotmart" | "kiwify" | "kirvano" | "stripe";
export const SALES_PLATFORM_LABEL: Record<SalesPlatform, string> = {
  hotmart: "Hotmart",
  kiwify: "Kiwify",
  kirvano: "Kirvano",
  stripe: "Stripe",
};

export interface Product {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  color: string;
  owner_id: string;
  status: ProductStatus;
  project_link: string | null;
  sales_platforms: SalesPlatform[];
  checkout_link: string | null;
  instagram: string | null;
  suggested_price: number | null;
  created_at: string;
  updated_at: string;
}

export const ORG_ROLE_LABEL = {
  admin: "Admin",
  gestor: "Gestor",
  lider: "Líder",
  operacional: "Operacional",
} as const;
export type OrgRole = keyof typeof ORG_ROLE_LABEL;

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string | null;
  invited_email: string;
  name: string | null;
  role: OrgRole;
  created_at: string;
  updated_at: string;
}

export const PRIORITY_WEIGHT: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };

export function sortTasksPriorityThenDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pw !== 0) return pw;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}