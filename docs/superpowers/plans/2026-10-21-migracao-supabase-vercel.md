# Migração para Supabase e Vercel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converter o Controle de Fiados de aplicação local SQLite para uma aplicação online em Next.js, Supabase Auth e PostgreSQL, protegida por um único administrador.

**Architecture:** O Next.js continuará contendo a UI, as rotas e as regras financeiras, mas as dependências de SQLite, arquivo local e processos persistentes serão substituídas por PostgreSQL via Drizzle. O Supabase Auth fornecerá a sessão; middleware e handlers a validarão antes de acessar os dados. O PostgreSQL aplicará constraints, triggers de integridade e RLS para o usuário administrador.

**Tech Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM + postgres.js, Supabase PostgreSQL, Supabase Auth, `@supabase/ssr`, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-21-migracao-supabase-vercel-design.md`

## Global Constraints

- O banco online inicia vazio: não importar SQLite, banco local ou backups existentes.
- Deve existir um único administrador criado manualmente; não criar cadastro público.
- O front-end não recebe `DATABASE_URL`, service-role key nem outros segredos de servidor.
- Usar valores em centavos como `bigint` PostgreSQL com modo `number`, preservando o limite seguro de `Number` do JavaScript.
- Não executar testes, build, migrations remotas, deploy nem criar recursos externos sem autorização explícita posterior do usuário.
- O diretório atual não é um repositório Git; não pressupor commits, branch ou worktree.

## Review Focus

- Sessão expirada ou ausente deve bloquear páginas, APIs e mutações sem revelar dados financeiros.
- Um mesmo `operacao_id` repetido com o mesmo conteúdo deve ser idempotente; com conteúdo diferente, deve falhar.
- Duas requisições concorrentes de pagamento não podem deixar o saldo negativo.
- Uma reversão não pode duplicar nem reverter uma compra já coberta por pagamento.
- RLS deve negar leitura/escrita pelo cliente anon e permitir apenas linhas do administrador autenticado.

---

## Estrutura de arquivos alvo

| Caminho | Responsabilidade |
|---|---|
| `src/server/db/schema.ts` | Tabelas PostgreSQL, `owner_id`, tipos, índices e relações Drizzle. |
| `src/server/db/connection.ts` | Cliente postgres.js/Drizzle assíncrono, transações e encerramento seguro. |
| `src/server/db/migrations/*` | Migration SQL PostgreSQL com constraints, triggers e políticas RLS. |
| `src/server/auth/require-session.ts` | Contrato de sessão obrigatória para páginas e rotas. |
| `src/lib/supabase/client.ts` | Cliente Supabase de navegador, somente com URL/chave anon públicas. |
| `src/lib/supabase/server.ts` | Cliente Supabase SSR baseado em cookies para Server Components/Route Handlers. |
| `src/middleware.ts` | Renovação de sessão e proteção de rotas; substitui o bloqueio exclusivo de loopback. |
| `src/app/login/page.tsx` | Formulário de login sem cadastro. |
| `src/app/login/actions.ts` | Server actions de entrar/sair, sem expor segredos. |
| `src/server/services/*.ts` | Regras financeiras convertidas para `Promise` e transações PostgreSQL. |
| `src/app/api/**/route.ts` e páginas | Aguardam serviços assíncronos e exigem sessão. |
| `src/app/configuracoes/page.tsx` | Configurações online sem banco/backup local. |
| `package.json`, `drizzle.config.ts`, `.env.example` | Dependências, dialeto PostgreSQL e variáveis documentadas sem valores. |
| `docs/INSTALACAO-WINDOWS.md`, `README.md`, `docs/ARQUITETURA.md` | Operação e publicação online; sem instruções de Node/atalhos Windows. |

### Task 1: Preparar dependências, ambiente e conexão PostgreSQL

**Files:**
- Modify: `package.json`
- Modify: `drizzle.config.ts`
- Modify: `src/server/db/connection.ts`
- Modify: `src/server/db/holder.ts`
- Modify: `src/server/config.ts`
- Create: `.env.example`
- Delete: `scripts/backup-cli.mjs`
- Delete: `scripts/abrir.mjs`
- Delete: `scripts/comum.mjs`
- Delete: `scripts/start.mjs`

**Interfaces:**
- Produces: `Db`, `getDb(): Db`, `withTransaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>`.
- Consumes: `DATABASE_URL`, carregada apenas no runtime do servidor.

- [ ] **Step 1: Adicionar `postgres`, `drizzle-orm`, `@supabase/supabase-js` e `@supabase/ssr` às dependências de produção; remover `better-sqlite3` e seus tipos.**

- [ ] **Step 2: Alterar `drizzle.config.ts` para `dialect: "postgresql"`, com schema em `src/server/db/schema.ts`, pasta de migrations exclusiva (`src/server/db/migrations`) e `dbCredentials.url` de `DATABASE_URL`.**

- [ ] **Step 3: Criar `.env.example` com nomes, sem valores, de `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.**

- [ ] **Step 4: Substituir a conexão síncrona por postgres.js e Drizzle assíncrono em `src/server/db/connection.ts`.**

  O cliente deve usar `prepare: false`, adequado ao pooler Supabase, e retornar uma instância singleton em `globalThis` para desenvolvimento. `withTransaction` encapsula `db.transaction` e traduz erros de banco para `DomainError` sem vazar SQL.

- [ ] **Step 5: Remover o `DbHolder` de arquivo e expor `getDb()` a partir de uma conexão PostgreSQL única.**

- [ ] **Step 6: Remover configuração de diretórios locais, porta, arquivos e scripts de supervisor/backup que não podem operar no ambiente serverless.**

- [ ] **Step 7: Criar testes unitários de configuração que falhem quando `DATABASE_URL` estiver ausente e que não exponham a URL em mensagens ao cliente. Não executar os testes sem autorização.**

### Task 2: Modelar e migrar a integridade financeira no PostgreSQL

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: `src/server/db/migrations/0000_inicial.sql`
- Create: `src/server/db/migrations/0001_integridade.sql`
- Delete: `drizzle/0000_inicial.sql`
- Delete: `drizzle/0001_integridade.sql`
- Delete: `drizzle/meta/_journal.json`
- Delete: `drizzle/meta/0000_snapshot.json`
- Delete: `drizzle/meta/0001_snapshot.json`

**Interfaces:**
- Produces: `clientes`, `contas`, `movimentacoes` e `administradores` para os serviços.
- Produces: o tipo `ownerId` UUID em cada tabela financeira.

- [ ] **Step 1: Converter `sqliteTable` para `pgTable`: chaves `bigserial` para IDs, `uuid` para `owner_id`, `boolean` para ativo, `timestamp with time zone` para datas e `bigint({ mode: "number" })` para centavos.**

- [ ] **Step 2: Incluir `owner_id` em `clientes`, `contas` e `movimentacoes`; adicionar `administradores(user_id uuid primary key references auth.users)` como lista explícita do único usuário autorizado.**

- [ ] **Step 3: Recriar constraints e índices atuais no SQL PostgreSQL.**

  Incluir unicidade de `contas.cliente_id` no mesmo `owner_id`, de `movimentacoes.operacao_id` por proprietário, uma reversão por original, checks de tipo/valor/motivo/descrição e índices para cliente, conta e histórico.

- [ ] **Step 4: Implementar triggers PostgreSQL para imutabilidade, relacionamento conta-cliente, reversão válida e saldo não negativo.**

  Usar `RAISE EXCEPTION` e lock apropriado da conta dentro do trigger/função para que transações concorrentes não ultrapassem o saldo.

- [ ] **Step 5: Ativar RLS e criar políticas de `SELECT`, `INSERT`, `UPDATE` e `DELETE` que só permitam linhas cujo `owner_id = auth.uid()` e cujo usuário esteja em `administradores`.**

- [ ] **Step 6: Criar casos de teste para as regras de banco: duplicação de operação, saldo negativo, segunda reversão, conta de outro cliente e acesso anon. Não executar sem autorização e sempre usar URL de teste isolada.**

### Task 3: Adicionar autenticação de administrador e proteção de rotas

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/server/auth/require-session.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Modify: `src/middleware.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/app/api/auth/signout/route.ts`
- Modify: `src/lib/origem.ts`
- Modify: `tests/seguranca.test.ts`

**Interfaces:**
- Produces: `requireSession(): Promise<{ userId: string }>`; lança/retorna resposta de não autorizado quando não houver sessão.
- Produces: `updateSession(req: NextRequest): Promise<NextResponse>` usado pelo middleware.
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e cookies de sessão do Supabase.

- [ ] **Step 1: Criar clientes Supabase para browser e servidor com `@supabase/ssr`; validar a presença das variáveis públicas sem mostrar chaves no HTML.**

- [ ] **Step 2: Implementar `requireSession()` e aplicá-lo como primeiro passo de cada route handler e página que consulta dados financeiros.**

- [ ] **Step 3: Criar `/login` com email/senha, ação de entrada e mensagem genérica para credenciais inválidas; não incluir botão, rota ou API de cadastro.**

- [ ] **Step 4: Criar logout que encerra a sessão Supabase e redireciona a `/login`.**

- [ ] **Step 5: Reescrever middleware para renovar cookies de sessão e redirecionar visitantes anônimos para `/login`, preservando `next` somente para caminho interno seguro.**

- [ ] **Step 6: Substituir a regra de host local por checagem de mesma origem compatível com o domínio publicado e manter a exigência de JSON para mutações.**

- [ ] **Step 7: Criar casos de segurança para visitante anônimo, sessão válida, Origin diferente e retorno pós-login. Não executar sem autorização.**

### Task 4: Converter serviços e rotas financeiras para operações assíncronas

**Files:**
- Modify: `src/server/services/lancamentos.ts`
- Modify: `src/server/services/consultas.ts`
- Modify: `src/server/services/saldos.ts`
- Modify: `src/server/domain/errors.ts`
- Modify: `src/app/api/clientes/route.ts`
- Modify: `src/app/api/compras/route.ts`
- Modify: `src/app/api/pagamentos/route.ts`
- Modify: `src/app/api/reversoes/route.ts`
- Modify: `src/app/api/saude/route.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/contas/[clienteId]/page.tsx`
- Modify: `tests/financeiro.test.ts`
- Modify: `tests/seguranca.test.ts`

**Interfaces:**
- Produces: `registrarCompra`, `registrarPagamento`, `reverterMovimentacao`, `resumoGeral`, `listarClientes`, `sugerirClientes` e `detalheCliente` como funções que retornam `Promise`.
- Consumes: `ownerId: string` de `requireSession` em toda consulta e mutação.

- [ ] **Step 1: Acrescentar `ownerId` às assinaturas de todos os serviços e filtrar por ele em cada seleção, agregação, inserção e verificação de idempotência.**

- [ ] **Step 2: Converter chamadas Drizzle de `.get()`/`.all()` para o padrão assíncrono postgres.js e executar compra, pagamento e reversão dentro de `withTransaction`.**

- [ ] **Step 3: Preservar os contratos de `ResultadoOperacao`, códigos de domínio e resposta `200` para repetida/`201` para operação nova.**

- [ ] **Step 4: Mapear códigos PostgreSQL de constraint/trigger para os `DomainError` existentes, sem retornar detalhes SQL ao cliente.**

- [ ] **Step 5: Tornar routes e Server Components `async`, exigir sessão antes de chamar serviços e aguardar seus resultados.**

- [ ] **Step 6: Ajustar testes financeiros para fixtures PostgreSQL isoladas, um `ownerId` de administrador e chamadas assíncronas. Não executar sem autorização.**

### Task 5: Remover operação local e adaptar Configurações

**Files:**
- Modify: `src/app/configuracoes/page.tsx`
- Delete: `src/components/fiados/backup-acoes.tsx`
- Delete: `src/server/services/backup.ts`
- Delete: `src/server/services/agendador.ts`
- Delete: `src/instrumentation-node.ts`
- Delete: `src/app/api/backups/route.ts`
- Delete: `src/app/api/backups/[arquivo]/download/route.ts`
- Delete: `src/app/api/restauracao/route.ts`
- Delete: `tests/backup.test.ts`
- Delete: `windows/abrir-sistema.vbs`
- Delete: `windows/iniciar-oculto.vbs`
- Delete: `windows/parar.ps1`
- Delete: `windows/criar-atalhos.ps1`
- Delete: `windows/atalhos/01-instalar.bat`
- Delete: `windows/atalhos/02-atualizar.bat`
- Delete: `windows/atalhos/03-parar.bat`
- Delete: `windows/atalhos/04-copiar-backup-externo.bat`
- Delete: `windows/atalhos/05-remover-atalhos.bat`

**Interfaces:**
- Produces: página de configurações online sem rotas/estado de backup local.

- [ ] **Step 1: Remover a UI de backup, download, restauração, status de diretórios e referências a banco local de Configurações.**

- [ ] **Step 2: Manter uma página de configurações mínima com identificação de conta, ação de logout e texto de operação online.**

- [ ] **Step 3: Remover serviços, APIs, testes, instrumentação e helpers de backup local.**

- [ ] **Step 4: Remover scripts Windows e atalhos; garantir que nenhuma rota, componente ou documentação operacional continue referenciando-os.**

### Task 6: Atualizar documentação e preparar publicação controlada

**Files:**
- Modify: `README.md`
- Modify: `docs/ARQUITETURA.md`
- Modify: `docs/INSTALACAO-WINDOWS.md`
- Delete: `docs/HOMOLOGACAO.md`
- Modify: `next.config.ts` (somente se necessário para runtime Vercel)
- Create: `docs/PUBLICACAO-VERCEL-SUPABASE.md`

**Interfaces:**
- Produces: instruções seguras, sem segredos, para criar o único administrador e publicar após autorização.

- [ ] **Step 1: Reescrever README e arquitetura para descrever Next.js + Supabase + Vercel, autenticação única e indisponibilidade offline.**

- [ ] **Step 2: Substituir a instalação Windows por um guia de uso do site e de criação manual do administrador no painel Supabase, mantendo valores e credenciais fora do documento.**

- [ ] **Step 3: Criar guia de publicação que liste: projeto Supabase, migrations, criação do administrador, variáveis Vercel, domínio e passos de reversão.**

- [ ] **Step 4: Antes de criar qualquer projeto Supabase/Vercel, apresentar ao usuário o efeito exato, as variáveis necessárias e pedir confirmação explícita.**

- [ ] **Step 5: Após autorização distinta, aplicar migrations em banco de produção vazio, configurar variáveis como segredos, publicar e executar a verificação manual aprovada pelo usuário.**

## Self-review

- Cobertura: as seis tarefas cobrem conexão, schema, segurança, regras financeiras, remoção de operação local e publicação.
- Consistência: toda camada financeira recebe `ownerId`, todos os handlers passam por `requireSession` e toda persistência usa o mesmo cliente PostgreSQL.
- Riscos principais: concorrência de pagamentos e compatibilidade de triggers são tratados por transaction/trigger PostgreSQL e pela revisão de testes isolados.
- Escopo: não inclui migração de banco antigo, múltiplos usuários, cadastro público ou backup/restauração manual.
- Execução: nenhuma etapa que cria serviço externo ou roda validações está autorizada por este plano; requer confirmação no momento de executá-la.
