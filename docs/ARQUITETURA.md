# Arquitetura

O Next.js hospeda a interface, as rotas de API e as regras de domínio. A autenticação usa cookies do Supabase Auth. Cada rota e página financeira chama `requireSession()`, que confirma a sessão e a presença do usuário na tabela `administradores`.

O servidor acessa PostgreSQL via Drizzle e postgres.js. Todas as linhas financeiras possuem `owner_id`; o PostgreSQL aplica constraints, trigger de saldo não negativo, imutabilidade de movimentações e Row Level Security.

```text
Navegador → Next.js/Vercel → Supabase Auth
                         └→ PostgreSQL/Supabase
```

O banco começa vazio e é mantido pelo Supabase. Não há arquivo SQLite, processo residente, backup local ou modo offline nesta arquitetura.
