import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, KanbanSquare, Users, Mail, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { StarField } from "@/components/star-field";
import { OnboardingDemoBoard } from "@/components/onboarding-demo-board";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="dark landing-shell relative overflow-hidden">
      <StarField />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B82F6] text-white shadow-[0_6px_20px_-6px_rgba(59,130,246,0.7)]">
              <KanbanSquare className="h-4 w-4" />
            </span>
            <span>Taskly</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <Link to="/login" className="hover:text-white">Entrar</Link>
          </nav>
          <Link
            to="/cadastro"
            className="glow-btn inline-flex items-center gap-2 rounded-full bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2563EB]"
          >
            Começar agora
          </Link>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <Sparkles className="h-3 w-3 text-[#3B82F6]" />
            Novo — gestor de tarefas simples e colaborativo
          </div>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Organize suas tarefas, projetos e entregas
            <span className="block bg-gradient-to-r from-white via-[#93C5FD] to-[#3B82F6] bg-clip-text text-transparent">
              em um só lugar.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Um gestor simples, visual e prático para acompanhar o que está aberto,
            pendente e pronto para produzir — sozinho ou com outras pessoas.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/cadastro"
              className="glow-btn inline-flex items-center gap-2 rounded-full bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2563EB]"
            >
              Criar minha conta <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#recursos"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/10"
            >
              Ver recursos
            </a>
          </div>

          {/* Preview mock */}
          <div className="glass-card mt-20 w-full rounded-3xl p-4 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Abertas", value: 12, color: "#60A5FA" },
                { label: "Pendentes", value: 5, color: "#FBBF24" },
                { label: "Para produzir", value: 3, color: "#C084FC" },
                { label: "Concluídas", value: 24, color: "#4ADE80" },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <div className="text-xs text-white/60">{c.label}</div>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-3xl font-semibold" style={{ color: c.color }}>{c.value}</span>
                    <span className="mb-1 h-2 w-2 rounded-full" style={{ background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo interativo */}
        <section className="pb-24">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Veja como é simples</h2>
            <p className="mt-3 text-white/60">Crie uma tarefa de teste agora mesmo, sem precisar de conta.</p>
          </div>
          <OnboardingDemoBoard />
        </section>

        {/* Recursos */}
        <section id="recursos" className="py-24">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Tudo o que você precisa. Nada além.</h2>
            <p className="mt-3 text-white/60">Recursos essenciais para organizar sua rotina pessoal e profissional.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: KanbanSquare, title: "Visualização rápida das tarefas", desc: "Board Kanban limpo com todos os seus status em um só olhar." },
              { icon: CheckCircle2, title: "Organização por status", desc: "Aberto, pendente, para produzir, em andamento e concluído." },
              { icon: Users, title: "Projetos com colaboradores", desc: "Compartilhe projetos com sua equipe e defina permissões." },
              { icon: Mail, title: "Convites para pessoas externas", desc: "Convide qualquer pessoa por email para participar do projeto." },
              { icon: Calendar, title: "Prazos, prioridades e responsáveis", desc: "Cada tarefa com seu contexto completo." },
              { icon: Sparkles, title: "Gestão simples e rápida", desc: "Ideal para rotina pessoal ou profissional, sem burocracia." },
            ].map((f) => (
              <div key={f.title} className="glass-card rounded-2xl p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 text-[#93C5FD]">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="py-24">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Como funciona</h2>
            <p className="mt-3 text-white/60">Comece em minutos.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Crie um projeto", d: "Dê um nome e uma descrição rápida ao que você vai organizar." },
              { n: "02", t: "Organize suas tarefas por status", d: "Mova cartões entre colunas conforme o trabalho avança." },
              { n: "03", t: "Convide pessoas e acompanhe", d: "Chame colaboradores por email e acompanhe o andamento juntos." },
            ].map((s) => (
              <div key={s.n} className="glass-card rounded-2xl p-6">
                <div className="text-sm font-semibold text-[#3B82F6]">{s.n}</div>
                <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-white/60">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="py-24 text-center">
          <div className="glass-card mx-auto max-w-3xl rounded-3xl p-12">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Comece simples. Organize melhor. Produza com clareza.
            </h2>
            <div className="mt-8">
              <Link
                to="/cadastro"
                className="glow-btn inline-flex items-center gap-2 rounded-full bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2563EB]"
              >
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Taskly. Feito para quem quer clareza.
        </footer>
      </div>
    </div>
  );
}
