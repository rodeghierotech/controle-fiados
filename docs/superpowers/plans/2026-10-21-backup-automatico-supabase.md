# Backup Automático das Contas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar automaticamente um backup privado e consistente das contas de fiado a cada três dias, mantendo somente os dois arquivos mais recentes.

**Architecture:** Uma rota `GET` protegida por segredo será chamada diariamente pelo Vercel Cron e delegará a geração a um serviço de backup. O serviço exporta os dados de um administrador, envia um manifesto JSON versionado ao bucket privado do Supabase Storage, registra a execução no PostgreSQL e só limpa arquivos antigos depois de uma gravação completa.

**Tech Stack:** Next.js 15 Route Handlers, TypeScript, Drizzle ORM/PostgreSQL, `@supabase/supabase-js`, Supabase Storage privado, Vercel Cron, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-21-backup-automatico-supabase-design.md`

## Global Constraints

- Exportar somente `clientes`, `contas` e `movimentacoes` de cada administrador.
- Agendar uma chamada diária em UTC; criar novo backup apenas após 72 horas desde o último sucesso.
- Armazenar os objetos JSON no bucket privado `backups-contas` e manter somente os dois mais recentes por administrador.
- `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` são variáveis secretas de servidor; não podem aparecer em respostas, logs ou código cliente.
- Não implementar download, restauração, cópia externa, backup de código ou de usuários do Supabase Auth.

## Review Focus

- Cabeçalho `Authorization` ausente ou incorreto deve retornar 401 sem consultar banco ou Storage — coberto na Task 3.
- Chamada antes de 72 horas deve responder `nao_devido` e não criar arquivo — coberto na Task 2.
- Falha no upload não pode inserir execução válida nem apagar arquivo existente — coberto na Task 2.
- A terceira execução bem-sucedida deve preservar exatamente os dois objetos mais novos do mesmo administrador — coberto na Task 2.
- Backup de um administrador não pode incluir registros de outro administrador — coberto na Task 2.

---

### Task 1: Persistência e contrato do backup

**Files:**
- Create: `src/server/db/migrations/0002_backups.sql`
- Modify: `src/server/db/schema.ts`
- Modify: `.env.example`
- Test: `tests/backup-schema.test.ts`

**Interfaces:**
- Produces table `backup_execucoes` with `id`, `owner_id`, `objeto`, `criado_em`, `tamanho_bytes`, `checksum` and index `(owner_id, criado_em desc)`.
- Produces Drizzle export `backupExecucoes` used by `src/server/services/backups.ts`.
- Produces documented server-only environment names `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.

- [ ] **Step 1: Write failing migration/schema tests**

Assert that the generated schema exposes `backupExecucoes`, that `ownerId` references the administrator identity, and that `objeto` is unique.

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `npm.cmd test -- tests/backup-schema.test.ts`

Expected: FAIL because the backup table/export does not exist.

- [ ] **Step 3: Add the `backup_execucoes` migration and Drizzle schema**

Create the table with a UUID/bigint-safe identity, `owner_id uuid not null`, object path text, creation timestamp with timezone, byte count bigint, and SHA-256 checksum text. Add the unique object constraint and owner/time index. Do not create Storage objects from this migration; bucket provisioning occurs in Task 3 with the Supabase dashboard/API.

- [ ] **Step 4: Add blank server-only placeholders to `.env.example`**

Add `SUPABASE_SERVICE_ROLE_KEY=` and `CRON_SECRET=` with comments saying they must remain secret and be configured in Vercel Production.

- [ ] **Step 5: Run the schema test to verify it passes**

Run: `npm.cmd test -- tests/backup-schema.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/db/migrations/0002_backups.sql src/server/db/schema.ts .env.example tests/backup-schema.test.ts
git commit -m "feat: add backup execution metadata"
```

### Task 2: Geração, envio e retenção do backup

**Files:**
- Create: `src/server/services/backups.ts`
- Test: `tests/backups.test.ts`

**Interfaces:**
- Consumes `Db`, `clientes`, `contas`, `movimentacoes`, and `backupExecucoes` from Task 1.
- Produces `executarBackupAutomatico(deps: DependenciasBackup, ownerId: string, agora: Date): Promise<ResultadoBackup>`.
- `DependenciasBackup` provides `db`, `storage.upload`, `storage.list`, and `storage.remove` so tests use an in-memory fake instead of Supabase.
- `ResultadoBackup` is `{ tipo: "criado"; objeto: string } | { tipo: "nao_devido" }`.

- [ ] **Step 1: Write failing tests for due date, owner scoping, upload failure, and retention**

Include one test for a prior success 71h59m ago (`nao_devido`); one for 72h exactly (`criado`); one asserting the manifest has only one owner’s clients/accounts/movements; one asserting upload failure preserves metadata and objects; and three successful executions asserting only the newest two paths remain.

- [ ] **Step 2: Run the service tests to verify they fail**

Run: `npm.cmd test -- tests/backups.test.ts`

Expected: FAIL because `executarBackupAutomatico` does not exist.

- [ ] **Step 3: Implement the versioned backup manifest and due-date lookup**

Define `BackupContasV1` with `versao: 1`, `geradoEm`, `ownerId`, and arrays for the three tables. Read every array filtered by `ownerId` inside one database transaction. Serialize deterministically, calculate SHA-256 with Node `crypto`, and name the object `owners/<ownerId>/backup-<UTC ISO safe>.json`.

- [ ] **Step 4: Implement upload-first persistence and retention**

Upload with `contentType: "application/json"` and no public URL. Only after success insert `backup_execucoes`; then list successful records newest-first and remove Storage objects plus metadata rows beyond the two most recent for that owner. If upload or insert fails, do not remove existing backups.

- [ ] **Step 5: Run the service tests to verify they pass**

Run: `npm.cmd test -- tests/backups.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/services/backups.ts tests/backups.test.ts
git commit -m "feat: generate retained private account backups"
```

### Task 3: Rota cron, armazenamento privado e agendamento Vercel

**Files:**
- Create: `src/app/api/cron/backup-contas/route.ts`
- Create: `vercel.json`
- Modify: `README.md`
- Modify: `docs/PUBLICACAO-VERCEL-SUPABASE.md`
- Test: `tests/cron-backup.test.ts`

**Interfaces:**
- Consumes `executarBackupAutomatico`, `getDb()`, `administradores`, `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Produces `GET /api/cron/backup-contas`, returning `{ resultado: "criado" | "nao_devido" }` without paths, user IDs, or financial data.
- `vercel.json` calls `/api/cron/backup-contas` daily at `05:00 UTC`; the service itself enforces the three-day interval.

- [ ] **Step 1: Write failing route tests for authorization and safe responses**

Test missing header and wrong bearer value return 401; a valid bearer value delegates to the backup service and returns only `resultado`; and service errors return 500 without exposing error details.

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm.cmd test -- tests/cron-backup.test.ts`

Expected: FAIL because the cron route does not exist.

- [ ] **Step 3: Implement the protected cron route**

Compare the request header exactly with `Bearer ${process.env.CRON_SECRET}` using a timing-safe comparison. Build a Supabase service client from `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; enumerate `administradores` and invoke the service once per owner. Log only outcome category and object count, never values or identifiers.

- [ ] **Step 4: Add daily Vercel Cron configuration**

Create `vercel.json` with the single cron path `/api/cron/backup-contas` and schedule `0 5 * * *`. Document that Vercel invokes it daily in UTC, while the service makes the effective cadence three days.

- [ ] **Step 5: Provision required cloud configuration after explicit confirmation**

In Supabase, create private bucket `backups-contas` with JSON-only upload policy/limit appropriate for the dataset. In Vercel Production, create secret `SUPABASE_SERVICE_ROLE_KEY` and a random 32+ character `CRON_SECRET`; redeploy. Do not print either value.

- [ ] **Step 6: Run route tests and the full suite**

Run: `npm.cmd test -- tests/cron-backup.test.ts`

Expected: PASS.

Run: `npm.cmd test`

Expected: PASS; report any existing unrelated failure separately.

- [ ] **Step 7: Verify production non-destructively**

Trigger the cron route only through the Vercel Cron tooling or wait for its scheduled execution. Confirm one private object and one metadata row exist, then confirm a second immediate invocation reports `nao_devido`. Do not delete or restore user data.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/cron/backup-contas/route.ts vercel.json README.md docs/PUBLICACAO-VERCEL-SUPABASE.md tests/cron-backup.test.ts
git commit -m "feat: schedule private account backups"
```
