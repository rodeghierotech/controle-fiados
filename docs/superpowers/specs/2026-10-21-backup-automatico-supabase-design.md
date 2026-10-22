# Backup automático das contas no Supabase

## Objetivo

Preservar uma cópia periódica dos dados financeiros do Controle de Fiados, sem usar o computador da loja e sem manter arquivos públicos. A rotina deve criar um backup quando o último backup válido tiver pelo menos três dias e manter somente os dois arquivos mais recentes.

## Escopo dos dados

Cada backup contém os dados necessários para reconstruir as contas de fiado de um administrador:

- `clientes`;
- `contas`;
- `movimentacoes`.

O backup não inclui código do projeto, usuários do Supabase Auth, variáveis de ambiente ou arquivos fora dessas contas. A tabela `administradores` não é exportada: a restauração futura deverá sempre ser associada ao administrador autenticado.

## Agendamento e retenção

A Vercel chamará diariamente uma rota de cron protegida por `CRON_SECRET`. A rota consulta o registro do último backup válido e encerra sem gerar arquivo enquanto não tiverem passado 72 horas. Assim, a limitação diária do plano Hobby é compatível com uma cadência efetiva de aproximadamente três dias.

Após gerar e validar um arquivo, a rotina guarda o novo backup e remove somente os arquivos que excederem os dois mais recentes. Em qualquer falha, os arquivos válidos existentes são preservados.

## Armazenamento e segurança

Os arquivos JSON serão salvos no bucket privado `backups-contas` do Supabase Storage. Objetos terão nomes previsíveis somente para o servidor, com identificador do administrador e data UTC. O bucket não terá URL pública ou política de leitura para visitantes.

A rota de cron só aceitará a chamada autenticada pelo `CRON_SECRET`. A chave de serviço do Supabase ficará exclusivamente em `SUPABASE_SERVICE_ROLE_KEY` como variável secreta da Vercel; ela nunca será enviada ao navegador ou registrada em logs.

## Consistência e formato

A geração lê os três conjuntos de dados do mesmo administrador em uma transação de leitura e cria um JSON versionado, contendo data de criação, versão do formato e os arrays de clientes, contas e movimentações. O arquivo é validado antes do envio ao Storage.

## Operação e falhas

A rota responde com um resumo sem dados pessoais: criado, não devido, ou falhou. Erros detalhados ficam apenas no log da Vercel. Um backup novo só conta como válido após armazenamento completo; a limpeza da retenção acontece depois disso.

## Fora do escopo desta etapa

- tela para baixar backups;
- restauração de dados;
- cópia para outro provedor externo;
- backups de código ou do Supabase Auth.

Restauração será uma etapa separada porque é destrutiva e precisa de confirmação, validação do arquivo e cópia preventiva.

## Validação prevista

1. Chamada autorizada cria o primeiro arquivo privado.
2. Nova chamada antes de 72 horas não cria outro arquivo.
3. Três execuções válidas mantêm somente os dois arquivos mais novos.
4. Chamada sem segredo válido recebe 401.
5. Falha no upload não remove backups existentes.
