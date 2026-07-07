import { Link, useNavigate } from "@tanstack/react-router";
import { KanbanSquare } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="dark landing-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B82F6] text-white shadow-[0_6px_20px_-6px_rgba(59,130,246,0.7)]">
            <KanbanSquare className="h-4 w-4" />
          </span>
          Taskly
        </Link>
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-white/60">{footer}</div>}
      </div>
    </div>
  );
}

export { useNavigate };

export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already registered")) return "Já existe uma conta com esse email.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Falha de conexão. Verifique sua internet e tente novamente.";
  if (m.includes("invalid email")) return "Email inválido.";
  return message;
}