# Publicação: Supabase e Vercel

## Ordem segura

1. No Supabase, aplique `src/server/db/migrations/0000_inicial.sql`, `0001_integridade.sql` e depois `0002_backups.sql` em um projeto vazio.
2. Crie manualmente o único usuário em **Authentication > Users**. Não habilite cadastro público.
3. Registre o UUID desse usuário em `administradores`. Sem esse registro, a conta autenticada não acessa dados financeiros.
4. No Supabase Storage, crie o bucket privado `backups-contas`, aceitando somente `application/json`.
5. Na Vercel, configure `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` para Production. As duas últimas são secretas e não podem ter prefixo `NEXT_PUBLIC_`.
6. Publique o projeto. O `vercel.json` agenda a rota de backup diariamente às 05:00 UTC; o serviço grava somente quando completadas 72 horas desde o último backup e retém os dois mais recentes por administrador.
7. Teste manualmente login, compra, pagamento, reversão e logout.

## Reversão

Antes de uma atualização de schema, faça um backup pelo painel do Supabase. Caso uma publicação falhe, reverta o deployment na Vercel; não execute SQL destrutivo no banco de produção sem uma revisão específica.

## Limites de segurança

- `DATABASE_URL` é exclusiva do servidor.
- A chave anon é pública por design; as tabelas permanecem protegidas por RLS.
- Não inclua service-role key no app.
- `SUPABASE_SERVICE_ROLE_KEY` só é usada no servidor para gravar o JSON no bucket privado; ela nunca deve aparecer em logs, cliente ou commits.
- As migrations não criam usuários nem inserem administrador automaticamente.
