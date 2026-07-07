import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  KanbanSquare,
  FolderKanban,
  Package,
  Calendar,
  Users,
  Settings,
  LogOut,
  Search,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Layers,
  UserCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ProjectScopeProvider, useProjectScope } from "@/lib/project-scope";
import type { Project } from "@/lib/tasks";

const NAV = [
  { to: "/app", label: "Minhas Tarefas", icon: KanbanSquare },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/equipe", label: "Equipe", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function ProjectScopeSelector({ collapsed }: { collapsed: boolean }) {
  const { scope, setScope } = useProjectScope();
  const [open, setOpen] = useState(false);

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const project = (projects.data ?? []).find((p) => p.id === scope);
  const label = scope === "all" ? "Todos os projetos" : scope === "personal" ? "Tarefas Pessoais" : project?.name ?? "Selecionar";

  return (
    <div className="relative px-3 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
          style={{ background: project ? `${project.color}33` : "rgba(255,255,255,0.1)", color: project?.color ?? "#94a3b8" }}
        >
          <Layers className="h-3.5 w-3.5" />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-medium">{label}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && !collapsed && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-[#111624] py-1 shadow-xl">
            <button
              onClick={() => { setScope("all"); setOpen(false); }}
              className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5", scope === "all" ? "text-cyan-300" : "text-slate-300")}
            >
              <Layers className="h-3.5 w-3.5" /> Todos os projetos
            </button>
            <button
              onClick={() => { setScope("personal"); setOpen(false); }}
              className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5", scope === "personal" ? "text-cyan-300" : "text-slate-300")}
            >
              <UserCircle className="h-3.5 w-3.5" /> Tarefas Pessoais
            </button>
            {(projects.data ?? []).length > 0 && <div className="my-1 border-t border-white/5" />}
            {(projects.data ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => { setScope(p.id); setOpen(false); }}
                className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5", scope === p.id ? "text-cyan-300" : "text-slate-300")}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={cn("hidden shrink-0 border-r border-white/5 bg-[#0B0E17] md:flex md:flex-col transition-all", collapsed ? "w-20" : "w-64")}>
        <div className="flex h-16 items-center gap-2 border-b border-white/5 px-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-[0_0_16px_2px_rgba(34,211,238,0.45)]">
            <KanbanSquare className="h-4 w-4" />
          </span>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-base font-semibold text-white">Taskly Flow</div>
              <div className="truncate text-[11px] font-light tracking-wide text-slate-400">Gestor de projetos</div>
            </div>
          )}
        </div>

        <ProjectScopeSelector collapsed={collapsed} />

        <nav className="flex-1 space-y-1 p-3 pt-0">
          {NAV.map((item) => {
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active ? "bg-cyan-400/10 font-medium text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3 space-y-1">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            {!collapsed ? (
              <>
                <div className="truncate text-sm text-white">{user?.email}</div>
                <div className="text-[11px] text-slate-500">operação ativa</div>
              </>
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded-full bg-cyan-400/10 text-[10px] font-semibold text-cyan-300">
                {(user?.email ?? "?").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "Sair"}
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
            {!collapsed && "Recolher"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex md:hidden items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <KanbanSquare className="h-4 w-4" />
            </span>
            <span className="font-semibold">Taskly Flow</span>
          </div>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar tarefas..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              id="global-search"
            />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 flex items-center justify-around overflow-x-auto border-t border-border bg-background/95 py-2 backdrop-blur md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} className={cn("flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                <span className={cn("grid h-7 w-7 place-items-center rounded-full", active && "ring-2 ring-primary/60 bg-primary/10")}>
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ProjectScopeProvider>
      <AppShellInner>{children}</AppShellInner>
    </ProjectScopeProvider>
  );
}
