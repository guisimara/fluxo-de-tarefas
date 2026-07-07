## Taskly — Gestor de Tarefas Pessoal

Vou criar um projeto completo do zero com landing page pública, autenticação via Supabase e área interna com Kanban de tarefas, projetos e convites.

### Stack & Setup
- TanStack Start (já configurado) + Tailwind v4 + shadcn
- **Lovable Cloud** (Supabase) para banco e auth
- Fonte **Poppins** via `@fontsource/poppins`
- `@dnd-kit` para drag-and-drop no board

### Design System (`src/styles.css`)
- **Landing (dark)**: fundo `#05070D`, azul primário `#3B82F6`, glows/gradients sutis
- **App (light)**: fundo `#F6F7FB`, cards brancos, cabeçalhos pastel por status
- Tokens semânticos: `--status-open` (azul pastel), `--status-pending` (amarelo), `--status-produce` (lilás), `--status-progress` (pêssego), `--status-done` (verde)
- Poppins global, bordas arredondadas, sombras suaves
- Tema claro para app + classe `.dark` no root da landing

### Rotas
Públicas:
- `/` — Landing (hero centralizada, features, como funciona, CTA)
- `/login`, `/cadastro`, `/recuperar-senha`, `/reset-password`
- `/auth` — redirect canônico p/ integração

Protegidas (sob `_authenticated/`):
- `/app` — Dashboard: 4 cards de resumo + Kanban de todas as tasks do usuário
- `/app/projetos` — lista e criação
- `/app/projetos/$id` — board do projeto + convites
- `/app/calendario` — lista por vencimento
- `/app/equipe` — membros e convites
- `/app/configuracoes` — perfil

### Schema Supabase
Tabelas conforme spec:
- `profiles` (trigger auto-create on signup)
- `projects`
- `project_members` (role: admin/editor/viewer, status: pending/accepted, `invited_email` nullable)
- `tasks` (status enum: aberto/pendente/para_produzir/em_andamento/concluido, priority, tags jsonb)
- `task_comments`

**RLS** com função `is_project_member(project_id, user_id)` SECURITY DEFINER pra evitar recursão. Grants para `authenticated` + `service_role`.

### UI/Componentes
- **Sidebar** shadcn (Minhas Tarefas, Projetos, Calendário, Equipe, Configurações)
- **Topbar**: nome do projeto, busca, botões "Nova tarefa" e "Convidar", avatar menu
- **Cards de resumo** com cor pastel e ícone
- **Kanban**: 5 colunas com headers pastel, drag-and-drop, criar/editar via modal (Dialog)
- **Task modal**: título, descrição, projeto, status, prioridade, prazo, responsável, tags, comentários
- **Convite**: modal com email + role; cria row em `project_members` com status pending; lista mostra pendentes/aceitos
- **Mobile**: board vira lista por status (accordion/tabs)

### Tudo em pt-BR

Vou executar em ordem: habilitar Cloud → migração schema+RLS → design system → landing → auth pages → layout interno → dashboard/kanban → projetos → convites/equipe → calendário/config.
