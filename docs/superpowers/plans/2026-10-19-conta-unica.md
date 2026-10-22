# Conta unica por cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir conta corrente e dividas individuais por uma unica conta por cliente, sem saldo inicial.

**Architecture:** O novo esquema tera `clientes`, `contas` e `movimentacoes`, onde cada movimento aponta obrigatoriamente para uma conta. Servicos, contratos HTTP e componentes operarao sempre sobre a conta unica, e o banco local de teste sera recriado antes do uso.

**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM, SQLite, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-conta-unica-design.md`

## Global Constraints

- Apagar somente o banco ativo `%LOCALAPPDATA%\\ControleFiados\\banco\\fiados.db`, ou o equivalente sob `FIADOS_DATA_DIR`, depois de confirmar o caminho resolvido e que e o banco de teste autorizado.
- Nao apagar backups ou logs; backups do esquema anterior devem permanecer inelegiveis para restauracao no novo esquema.
- Nao executar testes, build, lint ou typecheck, conforme preferencia do usuario.
- Nao manter contratos, rotas ou componentes de saldo inicial, dividas individuais, destinos de pagamento ou vencimentos.
- Preservar idempotencia por `operacao_id`, regras de valor positivo e reversoes com motivo.

## Review Focus

- Compra de cliente novo deve criar exatamente uma conta e um unico movimento de compra.
- Pagamento acima do saldo aberto deve continuar rejeitado, mesmo sem destino selecionavel.
- Cancelar compra coberta por pagamento deve continuar bloqueado ate que o pagamento seja estornado.
- Reenvio com o mesmo `operacaoId` e mesma carga deve continuar idempotente; carga diferente deve falhar.
- Restauracao de backup criado no modelo antigo deve ser recusada, sem alterar o banco novo.

---

### Task 1: Recriar o esquema financeiro para conta unica

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: `drizzle/0002_conta_unica.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `drizzle/meta/0001_snapshot.json`
- Test: `tests/financeiro.test.ts`

**Interfaces:**
- Produces: tabela `contas` com `cliente_id` unico; `movimentacoes.conta_id` obrigatorio; tipos `COMPRA`, `PAGAMENTO`, `REVERSAO_COMPRA`, `ESTORNO_PAGAMENTO`.
- Consumes: `clientes` e mecanismo existente de migrations Drizzle.

- [ ] Definir em `schema.ts` a tabela `contas`, substituir `contasCorrentes` e remover `dividas`, `dividaId`, `origem` e o XOR de destinos; fazer `contaId` obrigatorio em `movimentacoes`.
- [ ] Limitar os checks de tipo e reversao aos quatro tipos aprovados; manter FKs, indice de cliente/data, unicidade de operacao e unicidade de reversao.
- [ ] Escrever `0002_conta_unica.sql` para recriar as tabelas financeiras no novo formato apos remover, nesta ordem, `movimentacoes`, `dividas` e `contas_correntes`.
- [ ] Atualizar os metadados Drizzle para registrar a migration e refletir o esquema final.
- [ ] Reescrever os cenarios de `tests/financeiro.test.ts` para conta unica e os cinco pontos de Review Focus; nao executar a suite.

### Task 2: Simplificar validacao, dominio e servicos financeiros

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/server/domain/constants.ts`
- Modify: `src/server/services/saldos.ts`
- Modify: `src/server/services/lancamentos.ts`
- Modify: `src/server/services/consultas.ts`
- Test: `tests/financeiro.test.ts`, `tests/helpers.ts`

**Interfaces:**
- Consumes: `compraSchema` com cliente, descricao, valor e `operacaoId`; `pagamentoSchema` com cliente, valor e `operacaoId`.
- Produces: `registrarCompra(ctx, entrada)`, `registrarPagamento(ctx, entrada)`, `reverterMovimentacao(ctx, entrada)` e `detalheCliente(ctx, clienteId)` sem destinos ou dividas.

- [ ] Remover `destinoSchema`, `saldoInicialSchema`, `SaldoInicialInput` e o campo `destino` dos schemas de compra e pagamento.
- [ ] Limitar constantes de debito, credito e reversao a compra e pagamento; remover origem de migracao e constantes de saldo inicial.
- [ ] Trocar funcoes de saldo por `saldoConta(ctx, contaId)` e `saldoCliente(ctx, clienteId)` baseadas exclusivamente em `movimentacoes.contaId`.
- [ ] Reescrever `registrarCompra` para garantir a conta unica e gravar sempre nessa conta; remover `registrarSaldoInicial` e toda criacao de divida.
- [ ] Reescrever `registrarPagamento` para localizar a conta do cliente, validar saldo nela e gravar sem destino de entrada.
- [ ] Simplificar resultado de operacao, reversao e consulta detalhada para uma conta e um saldo; remover `destinosPagaveis`, `DividaDetalhe` e rotulos de destino.
- [ ] Atualizar helpers e casos financeiros para os contratos simplificados; nao executar testes.

### Task 3: Remover contratos e superficie de saldo inicial/dividas

**Files:**
- Delete: `src/app/api/saldos-iniciais/route.ts`
- Delete: `src/components/fiados/saldo-inicial-dialog.tsx`
- Delete: `src/components/fiados/dividas-lista.tsx`
- Modify: `src/app/api/clientes/[id]/destinos/route.ts`
- Modify: `src/app/api/compras/route.ts`
- Modify: `src/app/api/pagamentos/route.ts`
- Modify: `src/app/api/reversoes/route.ts`

**Interfaces:**
- Consumes: servicos financeiros simplificados da Task 2.
- Produces: somente rotas de compra, pagamento, reversao e consulta de cliente compativeis com conta unica.

- [ ] Excluir a rota e o dialogo de saldo inicial, assegurando que nenhum import restante os referencia.
- [ ] Excluir a rota de destinos pagaveis, pois o pagamento nao seleciona destino.
- [ ] Ajustar rotas restantes somente para suas assinaturas simplificadas; preservar `tratar` e `lerJson` como tratamento de erro HTTP.
- [ ] Remover ou atualizar casos de API nos testes que enviam `destino` ou usam saldo inicial; nao executar testes.

### Task 4: Simplificar os fluxos visuais de compra, pagamento e detalhe

**Files:**
- Modify: `src/components/fiados/acoes-rapidas.tsx`
- Modify: `src/components/fiados/nova-compra-dialog.tsx`
- Modify: `src/components/fiados/pagamento-dialog.tsx`
- Modify: `src/components/fiados/reversao-dialog.tsx`
- Modify: `src/components/fiados/historico.tsx`
- Modify: `src/app/contas/[clienteId]/page.tsx`
- Modify: `src/components/fiados/cliente-combobox.tsx`

**Interfaces:**
- Consumes: respostas sem `destino` das Tasks 2 e 3.
- Produces: compras e pagamentos aplicados diretamente a uma conta do cliente e detalhe com saldo unico.

- [ ] Remover o botao e o estado de saldo inicial das acoes rapidas.
- [ ] Remover radio buttons, vencimento e campos de destino da compra; enviar apenas cliente, descricao e valor.
- [ ] Remover busca de destinos, lista de radios e `destinoInicial` do pagamento; mostrar o saldo unico do cliente e aplicar o pagamento a ele.
- [ ] Ajustar a revisao e as mensagens de sucesso para dizerem “saldo em aberto” em vez de destino ou conta corrente.
- [ ] Remover tipos e textos de saldo inicial da reversao e do historico, bem como a coluna/rotulo de destino; manter compra, pagamento e suas correcoes.
- [ ] Trocar os dois cartoes e a lista de dividas do detalhe por um cartao `Saldo em aberto` e historico.
- [ ] Remover a referencia a saldo inicial da documentacao do combobox e qualquer prop de UI que restar.

### Task 5: Recriar o banco de teste e alinhar operacao/documentacao

**Files:**
- Modify: `src/server/services/backup.ts`
- Modify: `docs/ARQUITETURA.md`
- Modify: `docs/HOMOLOGACAO.md`
- Modify: `docs/INSTALACAO-WINDOWS.md`
- Modify: `README.md`
- Delete: banco ativo em `%LOCALAPPDATA%\\ControleFiados\\banco\\fiados.db` ou em `FIADOS_DATA_DIR/banco/fiados.db`

**Interfaces:**
- Consumes: novo numero de migrations e esquema das Tasks 1–2.
- Produces: banco local vazio recriado pelo bootstrap e restauracao que rejeita backups de esquema incompativel.

- [ ] Ajustar a verificacao de compatibilidade de backup para rejeitar explicitamente bancos cujo conjunto de migrations nao corresponde ao novo esquema.
- [ ] Atualizar a documentacao para descrever apenas conta unica, compra, pagamento e reversoes; remover instrucoes de dividas e saldo inicial.
- [ ] Resolver o diretorio de dados com a mesma configuracao em uso, conferir o caminho absoluto final e confirmar que o alvo e exatamente `banco/fiados.db`.
- [ ] Apagar somente esse arquivo de banco autorizado; nao tocar em `backups`, `logs` ou outros arquivos sob o diretorio de dados.
- [ ] Reiniciar o ciclo normal da aplicacao para que o bootstrap aplique migrations e gere o banco vazio; nao executar testes, build, lint ou typecheck.

## Coverage Review

- O modelo de conta unica e a remocao de dividas sao cobertos pela Task 1.
- Regras financeiras, idempotencia e reversoes sao cobertas pela Task 2.
- A API de saldo inicial, destinos e contratos antigos sao removidos pela Task 3.
- Todas as telas descritas na especificacao sao cobertas pela Task 4.
- A limpeza limitada do banco, incompatibilidade de backups e documentacao sao cobertas pela Task 5.

O plano mantem os limites de dados aprovados e nao deixa requisitos da especificacao sem tarefa correspondente.
