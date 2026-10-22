# Controle de Fiados — Bom Pra Cachorro

**Especificação técnica da V1.0**  
**Estado:** planejamento aprovado; nenhuma implementação autorizada por este documento.  
**Objetivo:** substituir fichas físicas de fiado por um sistema simples, confiável e totalmente local em um único computador Windows.

## 1. Diretrizes obrigatórias

1. Priorizar a operação no balcão: **nome do cliente → descrição livre → valor → confirmar**. Data e hora são registradas automaticamente.
2. **Não há cadastro de clientes separado**, login, produtos, estoque, PDV, emissão fiscal, hospedagem, nuvem ou acesso por outros dispositivos.
3. O cliente é registrado internamente no primeiro lançamento financeiro, ou na migração de saldo inicial, e reutilizado nos seguintes.
4. Ao digitar um nome, sugerir contas existentes sem selecionar uma automaticamente; se não houver correspondência, permitir criar a conta no mesmo fluxo. Não mesclar pessoas por similaridade de nome.
5. O sistema oferece **conta corrente** (padrão) e **dívidas individuais** (opção secundária). O mesmo cliente pode ter ambos.
6. Pagamentos são aplicados **a um único destino escolhido manualmente**. Não distribuir automaticamente um pagamento entre dívidas.
7. Operações confirmadas são preservadas; correções são feitas por estorno/cancelamento auditável, sem sobrescrever ou apagar o histórico.
8. A aplicação deve funcionar **offline**, sem terminal para uso cotidiano, servida exclusivamente em `127.0.0.1`.
9. Toda alteração financeira deve ser atômica, consistente e resistente a cliques repetidos.
10. Não introduzir funcionalidades fora do escopo por iniciativa própria. Mudanças de regra dependem de aprovação.

## 2. Stack e execução

- **Next.js (App Router) + TypeScript**, backend local usando Route Handlers ou Server Actions com validação obrigatória no servidor.
- **SQLite + Drizzle ORM**, migrations versionadas.
- **Tailwind CSS + shadcn/ui em toda a interface**, Zod para entradas, componentes acessíveis e interface em português brasileiro.
- **Node.js LTS**, distribuição compilada em modo produção, nunca depender de `next dev` na loja.
- **Sem Docker**, Redis, banco remoto, Electron ou serviços externos.
- Servidor vinculado explicitamente a `127.0.0.1`, porta configurável (padrão 3000); atalho do Windows para abrir a URL local; inicialização automática após login do Windows, com supervisão/reinício em falhas.
- Armazenar banco e backups em diretório persistente próprio, fora da pasta de versão/release do aplicativo, com permissões do usuário autorizado do Windows. Não guardar dados no repositório.
- As dependências e recursos visuais necessários devem ser empacotados localmente (sem fontes, scripts ou CSS buscados pela internet em execução).

## 3. Conceitos do domínio

- **Cliente:** identidade interna (ID estável) e nome; não é necessário formulário específico de cadastro.
- **Conta corrente:** uma única por cliente, mantida mesmo com saldo zero; agrega compras e pagamentos nela direcionados.
- **Dívida individual:** obrigação separada, criada em uma compra ou na migração, com pagamentos próprios; vencimento opcional.
- **Lançamento:** registro financeiro imutável (compra, saldo inicial, pagamento ou reversão).
- **Saldo aberto de um destino:** soma dos débitos válidos menos créditos válidos, levando em conta reversões. Nunca pode ficar abaixo de zero em operação normal.
- **Saldo total do cliente:** saldo da conta corrente mais saldos de suas dívidas individuais.
- **Quitação:** saldo chega a zero; a dívida continua visível no histórico.
- **Cancelamento/estorno:** novo evento compensatório ligado ao lançamento original e com motivo obrigatório; não é exclusão física.

## 4. Requisitos funcionais

| Código | Exigência |
|---|---|
| RF01 | Registrar compra informando nome, descrição livre e valor; data/hora automáticas. |
| RF02 | Buscar clientes existentes por nome, ignorando caixa e acentos; exibir sugestões clicáveis. |
| RF03 | Criar cliente automaticamente com a primeira compra ou saldo inicial, após confirmação explícita de nova identidade. |
| RF04 | Adicionar compra à conta corrente por padrão; permitir criar dívida individual separada. |
| RF05 | Manter no máximo uma conta corrente por cliente e múltiplas dívidas individuais. |
| RF06 | Registrar saldo inicial de migração de papel sem classificá-lo como compra nova. |
| RF07 | Consultar saldos em aberto consolidados e por destino. |
| RF08 | Registrar pagamento parcial ou total escolhendo manualmente um único destino. |
| RF09 | Impedir pagamento zero, negativo ou superior ao saldo do destino. |
| RF10 | Consultar histórico cronológico, incluindo lançamentos, pagamentos, migração, cancelamentos e estornos. |
| RF11 | Preservar dívidas quitadas, oferecendo filtro de abertas/quitadas. |
| RF12 | Cancelar compra ou estornar pagamento com justificativa obrigatória, sem apagar registros. |
| RF13 | Buscar contas por cliente, incluindo clientes sem saldo pendente; filtros simples. |
| RF14 | Gerar backup automático diário, backup manual e relatório visível do último backup. |
| RF15 | Restaurar backup com confirmação, cópia preventiva, validação e reinicialização controlada. |
| RF16 | Executar o sistema no Windows sem terminal e sem internet. |
| RF17 | Exibir mensagens claras e impedir reenvio duplicado de operações. |

## 5. Modelagem lógica sugerida para SQLite

A modelagem abaixo define entidades e invariantes, **não é código SQL**. O Codex deve propor migrations depois que a especificação for aprovada.

### `clientes`
- `id`: identificador estável (PK).
- `nome`: texto não vazio; obrigatoriedade única de identificação na interface.
- `nome_busca`: forma normalizada para pesquisa (caixa/acentos), atualizada junto ao nome.
- `ativo`: booleano, padrão verdadeiro (inativação opcional via gerenciamento de conta, nunca exclusão física).
- `criado_em`, `atualizado_em`: instantes de auditoria.
- **Sem unicidade em `nome`/`nome_busca`**: homônimos são permitidos. Alertar sobre nomes parecidos, mas não fundir contas automaticamente.

### `contas_correntes`
- `id`: PK.
- `cliente_id`: FK para `clientes`, **UNIQUE** (uma conta corrente por cliente).
- `criado_em`.

### `dividas`
- `id`: PK.
- `cliente_id`: FK para `clientes`.
- `descricao`: texto livre, não vazio (para saldo migrado, descrição padronizada).
- `valor_original_centavos`: inteiro positivo; valor de origem para consulta.
- `vencimento_em`: data opcional, sem juros automáticos.
- `criado_em`.
- **Status pendente/parcial/quitada derivado do saldo**, nunca editado livremente.

### `movimentacoes`
- `id`: PK.
- `cliente_id`: FK para `clientes`.
- `conta_corrente_id`: FK nullable.
- `divida_id`: FK nullable.
- `tipo`: `COMPRA`, `SALDO_INICIAL`, `PAGAMENTO`, `REVERSAO_COMPRA`, `ESTORNO_PAGAMENTO`, `REVERSAO_SALDO_INICIAL` (o último apenas para correção auditada).
- `valor_centavos`: inteiro positivo; a direção débito/crédito vem do tipo.
- `descricao`: texto de compra ou informação contextual; obrigatório em compra.
- `ocorrido_em`: timestamp local da operação de negócio; V1 registra automaticamente no servidor.
- `registrado_em`: timestamp gerado no servidor (instante confiável do registro).
- `movimentacao_original_id`: FK nullable para movimentação revertida; preenchida só em reversões.
- `motivo`: texto obrigatório em reversões; não se exige nas demais.
- `operacao_id`: token de idempotência UNIQUE por confirmação lógica.
- `origem`: `OPERACAO` ou `MIGRACAO` (ou derivar do tipo, sem redundância desnecessária).
- **CHECK:** exatamente um dos destinos `conta_corrente_id` e `divida_id` deve estar preenchido (XOR).
- **CHECK:** valor em centavos maior que zero.
- Uma movimentação precisa pertencer ao mesmo cliente do destino financeiro.
- Uma reversão aponta para evento original do tipo compatível, de mesmo destino e valor, e o evento original não pode ser revertido duas vezes.
- Preferir registros imutáveis; nunca corrigir valores por `UPDATE` silencioso.

**Observação de design:** para dívidas individuais, a criação da dívida e o `COMPRA`/`SALDO_INICIAL` correspondente ocorrem na **mesma transação**. O valor original não deve ser somado duas vezes: o saldo é derivado apenas das movimentações. `valor_original_centavos` é metadado de exibição e deve coincidir com o débito inicial.

### `backup_execucoes` (metadados operacionais; opcional na primeira migration)
- `id`, `iniciado_em`, `concluido_em`, `status`, `destino`, `tamanho_bytes`, `erro_resumido`.
- Não registrar nome de clientes ou dados financeiros nos logs.
- O histórico de backups também pode ser salvo em metadados externos ao banco, porque deve continuar acessível quando o banco estiver indisponível.

### Índices e integridade
- Índices: `clientes(nome_busca)`, `dividas(cliente_id)`, `movimentacoes(cliente_id, registrado_em)`, `movimentacoes(conta_corrente_id)`, `movimentacoes(divida_id)`.
- Ativar `PRAGMA foreign_keys = ON` em todas as conexões.
- Migrations controladas e testadas; nunca recriar banco em instalação de atualização.
- Caso seja usado WAL, documentar checkpoint e procedimento seguro de backup/restauração.

## 6. Regras de negócio numeradas

- **RN01 — Clientes:** seleção de uma sugestão reutiliza seu ID. Entrada textual não basta para vincular a uma conta semelhante. Para nome não selecionado, confirmar explicitamente a criação. Homônimos são permitidos.
- **RN02 — Primeira operação:** cliente, conta corrente (se necessária) e primeira movimentação são criados em uma única transação. Se a gravação falhar, nada permanece parcialmente criado.
- **RN03 — Valores:** guardar exclusivamente em centavos inteiros; aceitar no máximo duas casas decimais e rejeitar entradas ambíguas/inválidas.
- **RN04 — Compra:** exige descrição não vazia e valor positivo. A data/hora vêm do servidor local automaticamente; a V1 não requer edição manual de data.
- **RN05 — Destino padrão:** conta corrente. Nova dívida individual deve ser uma escolha explícita, não o padrão.
- **RN06 — Pagamento:** requer destino explícito (conta corrente ou uma dívida), valor positivo e saldo suficiente. Revalidar o saldo **dentro da transação de escrita**, não só na tela.
- **RN07 — Liquidação:** saldo zero significa dívida quitada. Não excluir, arquivar automaticamente nem bloquear consulta ao histórico.
- **RN08 — Migração:** saldo inicial único por destino como evento de `SALDO_INICIAL`, com origem identificada; não contar como compra nova. Permitir abrir cliente sem nova compra quando há saldo antigo. Evitar migração duplicada por confirmação/idempotência e avisar quando já houver saldo inicial.
- **RN09 — Correções:** reversões referenciam evento original e pedem motivo obrigatório. Compra em dívida individual com pagamentos posteriores não pode ser cancelada diretamente; tratar primeiro os pagamentos vinculados. Nenhuma operação pode deixar saldo negativo.
- **RN10 — Idempotência:** cada envio financeiro recebe `operacao_id` único persistido. Repetição da mesma solicitação retorna o mesmo resultado sem novo lançamento; uso do mesmo ID com conteúdo diferente retorna conflito.
- **RN11 — Datas:** timestamps persistidos de forma inequívoca; mostrar no horário local do computador no padrão brasileiro `DD/MM/AAAA HH:mm`. O relógio da máquina deve estar correto.
- **RN12 — Consulta:** filtro padrão de clientes com saldo em aberto, com opção de ver todos/quitados. Ordenar por nome; busca instantânea com limitação/paginação apropriada.
- **RN13 — Segurança:** sem login na aplicação; confiar no bloqueio da sessão Windows e no servidor exclusivamente em loopback. Não afirmar que existe auditoria por funcionário.
- **RN14 — Exclusão:** não apagar clientes com histórico financeiro ou movimentações; preservar rastreabilidade.
- **RN15 — Consistência:** toda operação de escrita em transação SQLite; habilitar chaves estrangeiras, definir timeout para banco ocupado e retornar erros compreensíveis.

## 7. Fluxos operacionais

### F01 — Nova compra
1. Abrir **Nova compra**.
2. Digitar nome; exibir sugestões. Usuário seleciona cliente existente **ou** confirma criar cliente novo.
3. Digitar descrição e valor; destino padrão **Conta corrente**, opção **Dívida individual** (vencimento opcional).
4. Mostrar resumo: nome, destino, descrição, valor e data/hora automáticas.
5. Confirmar uma vez. No backend: validar, resolver/criar cliente, criar destino se necessário, lançar débito, confirmar transação.
6. Exibir sucesso e saldo atualizado; manter nome do cliente visível para conferência.

### F02 — Pagamento
1. Buscar e selecionar cliente.
2. Exibir conta corrente e dívidas com saldo positivo.
3. Escolher **um** destino manualmente, informar valor.
4. Mostrar saldo antes/depois e confirmar.
5. Backend valida saldo na mesma transação do crédito. Se insuficiente, não grava nada.
6. Mostrar confirmação e refletir novo saldo, inclusive quitação.

### F03 — Migrar ficha física
1. Abrir **Registrar saldo inicial** para cliente existente ou novo.
2. Informar valor atual da ficha e destino (conta corrente ou dívida individual).
3. Confirmar que a ficha foi conferida, com data automática e descrição “Saldo migrado da ficha física”.
4. Backend verifica que não é repetição, registra lançamento específico na transação e exibe saldo.
5. Preservar a ficha original por período de conferência definido pela loja.

### F04 — Consultar histórico
1. Buscar nome do cliente.
2. Abrir detalhe com saldo total, conta corrente, dívidas em aberto e quitadas.
3. Ver eventos ordenados por instante, tipo, destino, descrição e valor.
4. Visualizar reversões junto dos lançamentos originais; nunca esconder inconsistências.

### F05 — Cancelar/estornar
1. Selecionar lançamento elegível no histórico.
2. Mostrar consequências financeiras e solicitar motivo.
3. Verificar que ainda não foi revertido, que o tipo é válido e que a reversão não criará saldo negativo.
4. Criar evento compensatório vinculado, em transação; não apagar nem editar o original.

### F06 — Backup e restauração
1. Backup diário automático em horário oportuno e manual por ação explícita.
2. Usar mecanismo de backup consistente do SQLite, criar arquivo temporário, verificar integridade e concluir por renomeação atômica quando possível.
3. Guardar até 30 backups diários válidos, respeitando espaço e retenção; indicar data/hora de último sucesso e falhas.
4. **Backup externo:** oferecer cópia para pendrive ou outro dispositivo. Backups no mesmo HD não protegem contra falha física.
5. Restauração exige confirmação clara, cópia preventiva do banco atual, encerramento de conexões, verificação do arquivo de backup e reinício controlado.
6. Testar restauração antes do uso real, com verificação dos saldos esperados.

## 8. Interface e navegação

### `/` — Início / contas
- Título **Controle de Fiados — Bom Pra Cachorro**.
- Ações principais e evidentes: **Nova compra**, **Registrar pagamento**, **Registrar saldo inicial** (esta última pode ficar em menu secundário após a migração).
- Busca por cliente em destaque, com sugestões e cuidado com homônimos.
- Indicadores discretos: total a receber e número de clientes com saldo pendente.
- Lista alfabética com nome e saldo; filtros: Em aberto, Todos, Quitados.
- Sem botão **Cadastrar cliente**.

### `/contas/[clienteId]` — Detalhes
- Nome do cliente e saldo consolidado.
- Conta corrente: saldo, compras e pagamentos.
- Dívidas individuais: descrição, data, vencimento opcional, total, pago, saldo e status derivado.
- Histórico com cancelamentos e estornos identificados, sem excluir itens quitados.
- Ações de compra/pagamento próximas aos saldos; formulários em modais shadcn/ui.

### `/configuracoes` — Sistema
- Versão instalada, estado do serviço, status do backup, último sucesso e falhas.
- Backup manual, opção de copiar backup externamente, restauração guiada com advertências.

### Usabilidade
- Fluxos curtos, teclado funcional, foco automático na busca/campo mais relevante, botão de confirmação claramente identificado e desabilitado durante envio.
- Confirmações para pagamento, estorno e restauração. Não pedir confirmações redundantes na navegação comum.
- Acessibilidade básica (rótulos, foco, contraste, mensagens de erro junto aos campos).

## 9. Segurança e privacidade mínimas

- Endereço estritamente local (`127.0.0.1`); não abrir portas para rede local, não configurar acesso externo.
- Proteção do computador por senha/PIN e bloqueio automático do Windows. Sem login da aplicação por decisão do proprietário.
- Permissões do sistema de arquivos: somente a conta operacional autorizada e administradores têm acesso ao banco e backups.
- Validação de entrada no servidor; consultas parametrizadas via ORM; escapar texto de descrições na interface.
- Não enviar dados a analytics, erros remotos, fontes externas ou telemetria.
- Não colocar nomes, valores detalhados ou conteúdo de fichas nos logs técnicos.
- Limitar tamanho de campos e proteger ações sensíveis de solicitações indevidas originadas de outras páginas (por exemplo, verificar origem de requisições mutáveis quando aplicável); isolamento em loopback não substitui essas verificações.
- Política de backup e dispositivo externo protegido, preferencialmente com criptografia de disco/volume quando possível.

## 10. Requisitos não funcionais

- **RNF01:** operar sem internet depois da instalação.
- **RNF02:** iniciar com Windows e abrir via atalho, sem terminal e sem ambiente de desenvolvimento.
- **RNF03:** consistência de saldos e preservação de lançamentos confirmados em reinícios/interrupções, dentro das garantias transacionais e do armazenamento.
- **RNF04:** resposta rápida para busca e lançamentos no volume típico de uma loja pequena; medir com dados realistas, sem impor otimizações complexas antecipadas.
- **RNF05:** conteúdo em pt-BR, valores em reais, datas brasileiras.
- **RNF06:** backups automáticos confiáveis, indicação de falhas e teste real de restauração.
- **RNF07:** atualizações manuais com backup anterior e sem substituir o banco persistente.
- **RNF08:** testes automatizados de regras financeiras e testes manuais dos fluxos críticos.

## 11. Casos de erro obrigatórios

- Nome digitado coincide parcialmente com cliente existente → apresentar opções, não vincular por suposição.
- Homônimos → contas separadas, escolha explícita.
- Compra sem descrição, valor inválido, `0`, negativo ou com mais de duas casas decimais → rejeitar.
- Pagamento acima do saldo ou destinado a dívida quitada → rejeitar.
- Dois cliques no botão ou repetição após falha de rede local → uma operação somente.
- Cancelar compra cuja reversão tornaria saldo negativo → bloquear e explicar dependência de pagamentos.
- Estornar evento já estornado → bloquear.
- Banco bloqueado, disco cheio ou falha de I/O → não declarar sucesso; mostrar mensagem clara e preservar integridade.
- Falha no backup → manter último backup válido, sinalizar erro e oferecer ação corretiva.
- Backup inválido → impedir restauração; não substituir o banco atual.
- Reinício do Windows → acesso recuperado automaticamente sem dados duplicados.

## 12. Critérios de aceite

- [ ] Nova compra com nome novo cria cliente e movimento na mesma transação.
- [ ] Nome existente pode ser escolhido pelas sugestões e mantém histórico unificado.
- [ ] Nomes semelhantes e homônimos não são mesclados automaticamente.
- [ ] Data e hora são automáticas; formulário principal exige somente nome, descrição e valor.
- [ ] Conta corrente funciona como padrão e dívida individual como alternativa.
- [ ] Saldo inicial não conta como compra nova e pode ser registrado para cliente sem compra recente.
- [ ] Pagamento parcial e total alteram somente o destino selecionado.
- [ ] Pagamento superior ao saldo é rejeitado sem gravação parcial.
- [ ] Histórico de quitadas, cancelamentos e estornos permanece visível.
- [ ] Reversão inválida não causa saldo negativo.
- [ ] Envio duplicado não duplica cobrança nem pagamento.
- [ ] Saldos por conta e total batem em testes automatizados.
- [ ] Aplicação inicia no Windows e funciona offline, sem terminal.
- [ ] Backup automático e manual executam; uma restauração real foi testada.
- [ ] Banco está fora dos arquivos de release e sobrevive a uma atualização de versão.

## 13. Etapas de implementação propostas (não executar ainda)

1. **Fundação:** criar estrutura, shadcn/ui, Drizzle, SQLite, migrations, configurações locais e suíte de testes.
2. **Domínio financeiro:** modelar entidades, compra, saldo inicial, pagamentos, reversões, idempotência, invariantes e testes unitários/integrados.
3. **Interface operacional:** busca e criação implícita de cliente, nova compra, pagamento, consulta, dívidas e histórico.
4. **Backups:** cópia consistente, retenção, verificação, exportação externa e restauração testada.
5. **Distribuição Windows:** build de produção, armazenamento persistente, auto-início, atalho, instruções curtas de manutenção.
6. **Homologação:** cenários reais anonimizados, teste offline, teste de queda/reinício, validação de saldos e migração piloto.

## 14. Instruções para o Codex na próxima etapa

Antes de escrever código:

1. Ler este documento e o `AGENTS.md` do repositório, caso exista.
2. Apresentar **plano por etapas**, **árvore de arquivos proposta**, **esquema de banco/migrations**, **estratégia de testes** e **riscos de integridade financeira**.
3. Identificar explicitamente quaisquer ambiguidades remanescentes e propor a opção mais simples que preserve as regras, **sem expandir o escopo**.
4. Esperar aprovação da etapa de implementação solicitada. **A leitura desta especificação não autoriza programar.**
5. Usar shadcn/ui consistentemente nas telas e priorizar simplicidade operacional, segurança dos lançamentos e funcionamento offline.

---

**Limite da V1:** o objetivo é substituir a pasta física de contas de fiado, não construir um ERP ou PDV.
