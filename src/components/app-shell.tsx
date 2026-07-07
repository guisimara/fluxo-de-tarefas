import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { KanbanSquare, FolderKanban, Package, Calendar, Users, Settings, LogOut, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Minhas Tarefas", icon: KanbanSquare },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/equipe", label: "Equipe", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const initials = (user?.user_metadata?.name || user?.email || "?")
    .toString()
    .split(/\s|@/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-[#0B0E17] md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-white/5 px-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-[0_0_16px_2px_rgba(34,211,238,0.45)]">
            <KanbanSquare className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold text-white">Taskly</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active ? "text-white font-medium" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full transition",
                    active && "ring-2 ring-cyan-400 shadow-[0_0_10px_1px_rgba(34,211,238,0.7)] text-cyan-300 bg-cyan-400/10",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" /> Sair
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
            <span className="font-semibold">Taskly</span>
          </div>
          <div className="relative ml-auto hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar tarefas..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              id="global-search"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
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