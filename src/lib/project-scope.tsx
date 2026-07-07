import { createContext, useContext, useState, type ReactNode } from "react";

export type ProjectScope = "all" | "personal" | (string & {});

interface ProjectScopeContextValue {
  scope: ProjectScope;
  setScope: (scope: ProjectScope) => void;
}

const ProjectScopeContext = createContext<ProjectScopeContextValue | null>(null);

export function ProjectScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<ProjectScope>("all");
  return <ProjectScopeContext.Provider value={{ scope, setScope }}>{children}</ProjectScopeContext.Provider>;
}

export function useProjectScope() {
  const ctx = useContext(ProjectScopeContext);
  if (!ctx) throw new Error("useProjectScope must be used within ProjectScopeProvider");
  return ctx;
}
