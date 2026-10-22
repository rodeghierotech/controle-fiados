# Conta unica por cliente

## Objetivo

Simplificar o Controle de Fiados para que cada cliente tenha apenas uma conta. Compras aumentam o saldo dessa conta e pagamentos o reduzem. A aplicacao nao tera dividas individuais nem registro de saldo inicial.

## Escopo aprovado

- Remover a selecao entre conta corrente e divida individual.
- Remover vencimentos, destinos de pagamento e a tela/lista de dividas individuais.
- Remover o fluxo, a API e os tipos de movimentacao de saldo inicial.
- Apagar os dados de teste do banco local para aplicar o novo esquema sem migrar registros legados.
- Preservar backups existentes, sem promessa de restauracao em uma versao com esquema incompativel.

## Modelo de dados

O esquema novo contem tres entidades financeiras:

- `clientes`: cadastro do cliente.
- `contas`: uma conta por cliente, protegida por indice unico em `cliente_id`.
- `movimentacoes`: cada registro aponta obrigatoriamente para uma conta e pode ser `COMPRA`, `PAGAMENTO`, `REVERSAO_COMPRA` ou `ESTORNO_PAGAMENTO`.

`dividas`, `divida_id`, os tipos `SALDO_INICIAL` e `REVERSAO_SALDO_INICIAL`, e as regras de destino exclusivo deixam de existir. As movimentacoes mantem idempotencia por `operacao_id`, referencia a lancamento original para reversoes e as restricoes atuais de valor e motivo.

## Regras de negocio

- Uma compra cria o cliente, quando necessario, garante a conta unica e acrescenta o valor ao saldo.
- Um pagamento seleciona apenas o cliente e reduz seu saldo; nao pode ser superior ao saldo aberto.
- O cancelamento de compra e o estorno de pagamento continuam vinculados ao lancamento original.
- Uma reversao de compra nao pode fazer a conta ficar negativa; pagamentos que cobriram o valor precisam ser estornados antes.
- O saldo do cliente e exclusivamente o saldo da sua conta unica.

## Interface e contratos HTTP

- O dialogo de compra recebe cliente, descricao e valor; nao possui destino ou vencimento.
- O dialogo de pagamento recebe cliente e valor; nao possui lista ou selecao de destino.
- As acoes rapidas mostram somente Nova compra e Registrar pagamento.
- A pagina do cliente apresenta um unico cartao Saldo em aberto, acoes e historico.
- `POST /api/saldos-iniciais` e o componente de saldo inicial sao removidos.
- Os contratos de compra e pagamento removem o campo `destino`; clientes externos que ainda o enviarem receberao erro de validacao.

## Limpeza autorizada e limites

Antes de abrir o novo esquema, a implementacao apagara somente o banco local ativo em `%LOCALAPPDATA%\\ControleFiados\\banco\\fiados.db` ou no diretorio definido por `FIADOS_DATA_DIR`. Esse arquivo contem exclusivamente dados de teste, conforme autorizacao do usuario em 2026-10-19.

Os diretorios de backups e logs nao serao removidos. Backups criados pelo esquema antigo podem continuar armazenados, mas a restauracao deve rejeita-los por incompatibilidade de migrations em vez de tentar importar dados para o novo modelo.

## Arquivos e areas afetadas

- Esquema e migrations Drizzle.
- Servicos de lancamentos, saldos e consultas.
- Schemas de validacao, constantes e rotas de compra/pagamento/saldo inicial.
- Dialogos, acoes rapidas, detalhe do cliente, lista de dividas e historico.
- Testes financeiros e de seguranca relacionados aos contratos removidos.
- Documentacao de arquitetura, instalacao e homologacao que descreve dividas ou saldo inicial.

## Verificacao planejada

Nao executar testes, build ou validacoes automaticas nesta etapa, conforme preferencia do usuario. A implementacao deixara claro quais verificacoes nao foram executadas.
