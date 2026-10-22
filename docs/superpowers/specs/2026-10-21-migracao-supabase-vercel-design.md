# Migração do Controle de Fiados para Supabase e Vercel

## Objetivo

Publicar o Controle de Fiados como aplicação online, acessível por navegador, sem instalação de Node.js no computador da loja. A versão online manterá as operações financeiras atuais, começará sem dados reais e terá um único administrador autenticado.

## Decisões aprovadas

- A aplicação usará Supabase Auth com um único usuário administrador criado manualmente.
- O cadastro público ficará desativado.
- O banco será PostgreSQL do Supabase e começará vazio; não haverá importação de SQLite nem de backups existentes.
- O front-end e as rotas atuais continuarão em Next.js, publicados na Vercel. Não haverá reescrita para SPA.
- Todas as páginas e APIs exigirão sessão autenticada.
- O banco aplicará Row Level Security (RLS) e as políticas permitirão acesso apenas ao usuário administrador.
- A primeira versão online não terá backup/restauração de arquivo pelo navegador. A proteção operacional será a infraestrutura de backup do Supabase.
- Permanecem fora do escopo: múltiplos usuários, cadastro público, uso offline, migração de dados antigos e exportação/restauração manual.

## Arquitetura

O navegador autentica o administrador via Supabase Auth. O middleware do Next.js protege páginas e rotas que não sejam de autenticação. Cada handler de API valida a sessão e executa as regras de negócio usando uma conexão PostgreSQL no servidor.

O Supabase armazena `clientes`, `contas` e `movimentacoes`. A modelagem preservará as restrições financeiras existentes: valores positivos, uma conta por cliente, uma única reversão por movimentação, idempotência por `operacao_id`, imutabilidade dos lançamentos e proibição de saldo negativo. As regras que hoje dependem de gatilhos SQLite serão recriadas em PostgreSQL.

O serviço não terá processos persistentes. Portanto, o supervisor local, o agendador de backup, os scripts de backup e os atalhos Windows não participam da versão publicada. A Vercel hospeda o Next.js e o Supabase fornece autenticação, banco e backups gerenciados.

## Dados e rotas

As telas de compra, pagamento, reversão, histórico, recibo e consulta de clientes continuam usando as rotas atuais. Essas rotas passam a trabalhar com um adaptador PostgreSQL assíncrono e retornam os mesmos contratos HTTP sempre que possível.

A página de configurações será reduzida para a operação online: não mostrará caminho de dados local, status de servidor local, criação de backups `.db`, download ou restauração. O histórico financeiro permanece a fonte de auditoria das operações.

Em falhas de autenticação, o sistema redireciona para a tela de login ou responde `401`. Em erro de banco ou rede, a API não confirma parcialmente um lançamento e a interface mostra uma mensagem genérica, sem expor segredos ou detalhes internos.

## Segurança e segredos

- `NEXT_PUBLIC_SUPABASE_URL` e a chave pública anon serão usadas apenas para autenticação do navegador.
- A URL de conexão PostgreSQL e qualquer chave de serviço ficarão exclusivamente em variáveis protegidas no Supabase/Vercel.
- Nenhum segredo será colocado em `.env` versionado, código cliente, documentação ou logs.
- O middleware local que limita o host a `127.0.0.1` será substituído por proteção de sessão e validação de origem compatível com o domínio publicado.
- As políticas RLS serão ativas nas tabelas de domínio; acesso direto sem a sessão do administrador será negado.

## Publicação

Depois da implementação e da criação explícita dos serviços, serão configuradas as variáveis de ambiente na Vercel, aplicadas as migrations no Supabase e criado o único usuário administrador. A publicação será feita somente após a confirmação do usuário para criar/configurar esses recursos externos.

## Critérios de aceite

1. Um visitante sem sessão não consegue abrir telas nem chamar APIs financeiras.
2. O administrador consegue entrar e sair sem existir opção de cadastro público.
3. Compra, pagamento e reversão preservam as regras financeiras atuais no PostgreSQL.
4. Repetir a mesma operação idempotente não duplica lançamento.
5. Operações que deixariam uma conta negativa são recusadas.
6. A página de configurações não oferece mecanismos locais de banco ou backup.
7. O projeto pode ser publicado na Vercel apenas com variáveis de ambiente configuradas, sem arquivos de dados locais.

## Verificação

Por preferência do usuário, não executar testes, build ou validações automáticas sem autorização específica. Quando autorizada, a verificação cobrirá autenticação, bloqueio de acesso anônimo, compras, pagamentos, reversões, idempotência e saldo não negativo em um banco de teste isolado.
