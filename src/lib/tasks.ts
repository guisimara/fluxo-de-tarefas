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

export type RecurrenceFreq = "daily" | "weekly" | "monthly";
export type MonthlyRecurrenceMode = "day_of_month" | "weekday_of_month";

export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number;
  /** 0 = domingo ... 6 = sábado. Usado quando freq === "weekly". */
  byWeekday?: number[];
  /** Usado quando freq === "monthly". */
  monthlyMode?: MonthlyRecurrenceMode;
  /** Data (yyyy-mm-dd) até quando repetir. null/undefined = sem fim. */
  until?: string | null;
}

export const WEEKDAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
export const WEEKDAY_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

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
  recurrence: Recurrence | null;
  archived: boolean;
  archived_at: string | null;
  links: string[];
  created_at: string;
  updated_at: string;
}

/** Conjunto fixo de tags disponíveis para categorizar tarefas. */
export const TASK_TAGS = [
  "Branding",
  "Social",
  "Tráfego",
  "Design",
  "Site",
  "LP",
  "Sistema",
  "Gestão",
  "Pessoal",
] as const;

export const PRIORITY_DOT: Record<Priority, string> = {
  baixa: "bg-emerald-500",
  media: "bg-amber-500",
  alta: "bg-rose-500",
};

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

/**
 * Ordem padrão do gerenciador: tarefas com prazo aparecem primeiro, ordenadas
 * pela data; tarefas sem prazo mantêm a ordem de criação (posição manual via
 * drag-and-drop, com fallback para created_at quando a posição empata).
 */
export function sortTasksDefault(tasks: Task[]): Task[] {
  const withDate = tasks.filter((t) => t.due_date);
  const withoutDate = tasks.filter((t) => !t.due_date);
  withDate.sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  withoutDate.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.created_at.localeCompare(b.created_at);
  });
  return [...withDate, ...withoutDate];
}

export function describeRecurrence(r: Recurrence): string {
  const every = (unit: string, plural: string) => (r.interval <= 1 ? `${unit}` : `A cada ${r.interval} ${plural}`);
  if (r.freq === "daily") return every("Diariamente", "dias");
  if (r.freq === "weekly") {
    const days = (r.byWeekday ?? []).slice().sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]).join(", ");
    const base = r.interval <= 1 ? "Semanalmente" : `A cada ${r.interval} semanas`;
    return days ? `${base} (${days})` : base;
  }
  if (r.freq === "monthly") {
    const base = r.interval <= 1 ? "Mensalmente" : `A cada ${r.interval} meses`;
    return r.monthlyMode === "weekday_of_month" ? `${base}, mesmo dia da semana` : `${base}, mesmo dia do mês`;
  }
  return "Personalizado";
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(year, month, day);
}

function weekdayOccurrenceInMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

/** Calcula a próxima data (yyyy-mm-dd) de ocorrência a partir da data atual da tarefa, ou null se a regra tiver expirado. */
export function computeNextDueDate(currentDueDate: string, r: Recurrence): string | null {
  const cur = new Date(currentDueDate + "T00:00:00");
  let next: Date;

  if (r.freq === "daily") {
    next = new Date(cur);
    next.setDate(next.getDate() + Math.max(1, r.interval));
  } else if (r.freq === "weekly") {
    const days = r.byWeekday && r.byWeekday.length > 0 ? [...r.byWeekday].sort((a, b) => a - b) : [cur.getDay()];
    const curDow = cur.getDay();
    const sameWeek = days.find((d) => d > curDow);
    if (sameWeek !== undefined) {
      next = new Date(cur);
      next.setDate(cur.getDate() + (sameWeek - curDow));
    } else {
      const first = days[0];
      const daysToAdd = 7 * Math.max(1, r.interval) - curDow + first;
      next = new Date(cur);
      next.setDate(cur.getDate() + daysToAdd);
    }
  } else {
    // monthly
    const interval = Math.max(1, r.interval);
    if (r.monthlyMode === "weekday_of_month") {
      const weekday = cur.getDay();
      const occurrence = weekdayOccurrenceInMonth(cur);
      const targetMonthDate = new Date(cur.getFullYear(), cur.getMonth() + interval, 1);
      next = nthWeekdayOfMonth(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), weekday, occurrence);
    } else {
      const day = cur.getDate();
      const targetMonthDate = new Date(cur.getFullYear(), cur.getMonth() + interval, 1);
      const daysInTargetMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
      next = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), Math.min(day, daysInTargetMonth));
    }
  }

  if (r.until) {
    const until = new Date(r.until + "T00:00:00");
    if (next > until) return null;
  }

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}