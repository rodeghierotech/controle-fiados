# Controle de Fiados — Bom Pra Cachorro

Aplicação online para registrar compras, pagamentos e reversões de contas fiadas.

## Arquitetura

- Next.js 15 e TypeScript;
- Supabase Auth para a sessão do administrador;
- PostgreSQL do Supabase para os dados financeiros;
- Vercel para publicação.

O sistema é online e inicia com o banco vazio. Não há cadastro público, suporte a operação offline nem restauração de bancos SQLite locais.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e informe os valores do projeto Supabase:

```text
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

`DATABASE_URL` é segredo de servidor: nunca deve ser enviado ao navegador ou incluído em commits.

`SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` também são exclusivos do servidor. Eles servem somente ao backup automático e devem ser cadastrados como variáveis secretas na Vercel, nunca em código cliente.

## Backup automático

As contas são exportadas em JSON privado para o bucket `backups-contas` do Supabase Storage. A Vercel chama a rotina diariamente às 05:00 UTC, mas ela só cria um novo arquivo quando já se passaram 72 horas desde o último sucesso. Para cada administrador, apenas os dois backups mais recentes são mantidos. O backup inclui clientes, contas e movimentações — não inclui usuários do Supabase Auth, código ou arquivos públicos.

## Desenvolvimento

Com as variáveis configuradas e as migrations aplicadas a um banco de desenvolvimento isolado:

```powershell
npm run dev
```

Para publicar, siga [PUBLICACAO-VERCEL-SUPABASE.md](docs/PUBLICACAO-VERCEL-SUPABASE.md).
