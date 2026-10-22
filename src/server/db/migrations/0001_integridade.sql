create or replace function public.eh_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from administradores where user_id = auth.uid())
$$;

create or replace function public.validar_movimentacao()
returns trigger
language plpgsql
as $$
declare
  saldo_atual bigint;
begin
  if not exists (
    select 1 from contas c
    where c.id = new.conta_id
      and c.cliente_id = new.cliente_id
      and c.owner_id = new.owner_id
  ) then
    raise exception 'conta pertence a outro cliente';
  end if;

  if new.movimentacao_original_id is not null and not exists (
    select 1 from movimentacoes o
    where o.id = new.movimentacao_original_id
      and o.owner_id = new.owner_id
      and o.cliente_id = new.cliente_id
      and o.conta_id = new.conta_id
      and o.valor_centavos = new.valor_centavos
      and o.tipo = case new.tipo
        when 'REVERSAO_COMPRA' then 'COMPRA'
        when 'ESTORNO_PAGAMENTO' then 'PAGAMENTO'
      end
  ) then
    raise exception 'reversao invalida';
  end if;

  perform pg_advisory_xact_lock(new.conta_id);
  select coalesce(sum(case when tipo in ('COMPRA', 'ESTORNO_PAGAMENTO') then valor_centavos else -valor_centavos end), 0)
  into saldo_atual
  from movimentacoes
  where conta_id = new.conta_id and owner_id = new.owner_id;

  if saldo_atual + (case when new.tipo in ('COMPRA', 'ESTORNO_PAGAMENTO') then new.valor_centavos else -new.valor_centavos end) < 0 then
    raise exception 'saldo negativo';
  end if;
  return new;
end;
$$;

create trigger trg_mov_integridade
before insert on movimentacoes
for each row execute function public.validar_movimentacao();

create or replace function public.bloquear_alteracao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'registros financeiros sao imutaveis';
end;
$$;

create trigger trg_mov_sem_update
before update or delete on movimentacoes
for each row execute function public.bloquear_alteracao();

alter table administradores enable row level security;
alter table clientes enable row level security;
alter table contas enable row level security;
alter table movimentacoes enable row level security;

create policy admin_proprio on administradores for select using (user_id = auth.uid());
create policy clientes_do_admin on clientes for all using (owner_id = auth.uid() and public.eh_administrador()) with check (owner_id = auth.uid() and public.eh_administrador());
create policy contas_do_admin on contas for all using (owner_id = auth.uid() and public.eh_administrador()) with check (owner_id = auth.uid() and public.eh_administrador());
create policy movimentacoes_do_admin on movimentacoes for all using (owner_id = auth.uid() and public.eh_administrador()) with check (owner_id = auth.uid() and public.eh_administrador());
