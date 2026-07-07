import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/lib/auth-form";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Criar conta — Taskly" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("As senhas não coincidem");
    if (password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: window.location.origin + "/app" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada com sucesso!");
    navigate({ to: "/app" });
  };

  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="Comece a organizar suas tarefas em minutos."
      footer={<>Já tem uma conta? <Link to="/login" className="text-[#93C5FD] hover:text-white">Entrar</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm text-white/70">Nome</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#3B82F6]" />
        </div>
        <div>
          <label className="text-sm text-white/70">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#3B82F6]" />
        </div>
        <div>
          <label className="text-sm text-white/70">Senha</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#3B82F6]" />
        </div>
        <div>
          <label className="text-sm text-white/70">Confirmar senha</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#3B82F6]" />
        </div>
        <button disabled={loading} className="glow-btn w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60">
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>
    </AuthShell>
  );
}