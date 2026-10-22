# Relatório de implementação — Controle de Fiados V1

Data: 14/10/2026 · Ambiente de desenvolvimento/validação: Linux, Node.js 22.22, npm 10.9 (**não** foi possível executar Windows).

## 1. O que foi entregue
Aplicação completa conforme `SPEC.md` e o prompt de implementação: código-fonte, banco SQLite com migrations, serviços financeiros,
interface shadcn/ui, backup/restauração, testes automatizados, scripts Windows, documentação.
Telas: **Início** (`/`), **Detalhe do cliente** (`/contas/[id]`), **Configurações** (`/configuracoes`); diálogos de nova compra,
pagamento, saldo inicial, cancelamento/estorno e restauração. Não há cadastro manual de clientes, login, estoque ou integrações.

## 2. Validações realizadas (comandos reais)
| Validação | Comando / método | Resultado |
|---|---|---|
| Instalação limpa a partir do ZIP | `npm ci` em cópia extraída do ZIP | OK (468 pacotes, sem compilação nativa) |
| Lint | `npm run lint` (ESLint, next/core-web-vitals + typescript) | 0 erros/avisos |
| Tipos (strict) | `npm run typecheck` (`tsc --noEmit`) | 0 erros |
| Testes automatizados | `npm test` (Vitest) | **66/66 aprovados** em 4 arquivos |
| Build de produção | `npm run build` (também na cópia extraída do ZIP) | OK |
| Servidor de produção | `node scripts/start.mjs` (supervisor) em 127.0.0.1 | OK; só escuta `127.0.0.1` (confirmado em `/proc/net/tcp`; IP externo recusa conexão) |
| Smoke HTTP | curl: Host malicioso → 403; POST de origem externa → 403; `text/plain` → 403; compra, reenvio idempotente, pagamento excessivo → 422, backup, download, restauração via API, path traversal → 422 | OK |
| Reinício automático | `kill -9` do servidor filho | supervisor reiniciou; dados mantidos |
| Fluxos de tela (Chromium/Playwright) | compra com cliente novo + duplo clique, dívida individual, pagamento parcial, pagamento acima do saldo (bloqueado), estorno com motivo obrigatório, saldo inicial, quitação, backup manual e restauração pela UI, layout mobile | OK; sem erros de console; duplo clique gerou 1 lançamento |
| Mutação nos testes | removida a checagem de saldo e a idempotência (temporariamente) | testes falharam como esperado; código restaurado |

### Testes automatizados (66)
- `money` (4): parsing em centavos, ambiguidade, rejeições, formatação.
- `financeiro` (42): criação automática de clientes; identificação de existentes; homônimos/nomes parecidos não mesclados; compras; conta corrente; dívidas individuais; pagamentos parciais/total; quitação; bloqueio de pagamento excessivo/zero/negativo/destino quitado/de outro cliente; cancelamento e estorno (motivo obrigatório, reversão única, bloqueio por saldo negativo); idempotência (compra, pagamento, estorno, conflito, reenvio com cliente novo); saldo inicial (não é compra, duplicidade, correção por reversão, dívidas); integridade de saldos (300 operações pseudoaleatórias comparadas ao modelo); recuperação após falha (rollback total); imutabilidade e saldo negativo recusados pelo próprio banco; busca sem acento/caixa; injeção SQL como dado.
- `backup` (12): backup consistente em WAL, histórico, retenção de 30, backup diário único por dia, falha preserva o último válido, nomes fora do padrão recusados, restauração completa com preventivo, backup corrompido/estranho recusado sem tocar no banco, **falha durante a troca desfaz tudo**.
- `seguranca` (8): Host/Origin/Sec-Fetch-Site/Content-Type, nenhuma ação financeira por GET, erros sem vazar caminhos/SQL, corpo excessivo, download restrito.

## 3. Decisões e desvios em relação à SPEC
1. **`impressao_operacao`** (hash do conteúdo) adicionada a `movimentacoes` para cumprir a RN10 (mesmo id + conteúdo diferente = conflito).
2. **Saldo inicial**: um ativo por conta corrente; dívidas migradas idênticas (valor + descrição) bloqueadas. Correção = reverter com motivo e registrar de novo.
3. **Triggers de integridade** no banco (imutabilidade, destino do cliente, reversão válida, saldo não negativo) além das regras nos serviços.
4. **Restauração em processo**: o “reinício controlado” é feito fechando e reabrindo a conexão (sem derrubar o servidor), com rollback automático.
5. **Backup via `VACUUM INTO`** (síncrono e consistente) em vez da API assíncrona `backup()`; metadados de backup ficam em `backups/historico.json` (fora do banco, como previsto na SPEC §5).
6. **Node.js ≥ 22**: exigência do `better-sqlite3` 13, que traz binários pré-compilados (inclui Windows x64/ARM64). O `.npmrc` usa `ignore-scripts=true` para o npm não tentar compilar (sem Visual Studio).
7. **shadcn/ui**: componentes escritos localmente no padrão do shadcn (Radix + Tailwind + CVA) porque o registro do CLI não é acessível no ambiente; ficam em `src/components/ui`.
8. Sem fontes externas: pilha de fontes do sistema (San Francisco/Segoe UI).

## 4. Limitações restantes (não validadas aqui)
- **Windows**: `windows\atalhos\01-instalar.bat`, `windows\atalhos\02-atualizar.bat`, `.vbs`, `.ps1`, atalhos, inicialização automática e `parar.ps1` foram escritos mas **não executados** (ambiente Linux). Ver `docs/HOMOLOGACAO.md`.
- A instalação exige internet **uma vez** (npm) e Node.js 22+ instalado; depois funciona offline (testado apenas em ambiente sem navegador externo; teste offline real no Windows pendente).
- Restauração testada com dados de teste; a SPEC exige **teste de restauração real** na loja antes do uso.
- `npm audit` aponta avisos em ferramentas de CSS de *build* (tailwindcss/postcss/braces e o postcss embutido no Next). Processam apenas CSS do próprio projeto durante o build; não há entrada de usuário nelas em produção. Atualizações maiores (Tailwind 4 / Next 16) ficam para uma versão futura.
- Backups no mesmo disco não protegem contra falha física: a rotina de cópia para pendrive é manual (botão **Baixar** ou `windows\atalhos\04-copiar-backup-externo.bat`).
- Sem autenticação (decisão do proprietário): quem usa o computador desbloqueado acessa os dados; proteja o Windows com senha/PIN.
- Inativação de clientes existe só no modelo de dados (sem interface), por estar fora do escopo.
