export const STATUS_ORDER = ["aberto", "pendente", "para_produzir", "em_andamento", "concluido"] as const;
export type Status = typeof STATUS_ORDER[number];

export const STATUS_LABEL: Record<Status, string> = {
  aberto: "Aberto",
  pendente: "Pendente",
  para_produzir: "Para Produzir",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

export const STATUS_TOKEN: Record<Status, { bg: string; fg: string; dot: string }> = {
  aberto: { bg: "bg-status-open", fg: "text-status-open-fg", dot: "bg-[#60A5FA]" },
  pendente: { bg: "bg-status-pending", fg: "text-status-pending-fg", dot: "bg-[#FBBF24]" },
  para_produzir: { bg: "bg-status-produce", fg: "text-status-produce-fg", dot: "bg-[#C084FC]" },
  em_andamento: { bg: "bg-status-progress", fg: "text-status-progress-fg", dot: "bg-[#FB923C]" },
  concluido: { bg: "bg-status-done", fg: "text-status-done-fg", dot: "bg-[#4ADE80]" },
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

export interface Project {
  id: string;
  name: string;
  description: string | null;
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