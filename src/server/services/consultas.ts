import { and, desc, eq, sql } from "drizzle-orm";
import { normalizarBusca } from "@/lib/text";
import type { Db } from "../db/connection";
import { clientes, movimentacoes } from "../db/schema";
import { SQL_TIPOS_DEBITO, type TipoMovimentacao } from "../domain/constants";
import { DomainError } from "../domain/errors";

const delta = sql<number>`case when ${movimentacoes.tipo} in (${sql.raw(SQL_TIPOS_DEBITO)}) then ${movimentacoes.valorCentavos} else -${movimentacoes.valorCentavos} end`;

export type FiltroClientes = "abertos" | "todos" | "quitados";

export interface LinhaCliente {
  id: number;
  nome: string;
  saldoCentavos: number;
  ultimaMovimentacaoEm: string | null;
}

async function clientesComSaldo(db: Db, ownerId: string): Promise<LinhaCliente[]> {
  const linhas = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      saldoCentavos: sql<number>`coalesce(sum(${delta}), 0)`,
      ultimaMovimentacaoEm: sql<Date | null>`max(${movimentacoes.registradoEm})`,
    })
    .from(clientes)
    .leftJoin(movimentacoes, and(eq(movimentacoes.ownerId, ownerId), eq(movimentacoes.clienteId, clientes.id)))
    .where(eq(clientes.ownerId, ownerId))
    .groupBy(clientes.id, clientes.nome);

  return linhas.map((linha) => ({
    ...linha,
    saldoCentavos: linha.saldoCentavos ?? 0,
    ultimaMovimentacaoEm: linha.ultimaMovimentacaoEm
      ? (linha.ultimaMovimentacaoEm instanceof Date ? linha.ultimaMovimentacaoEm : new Date(linha.ultimaMovimentacaoEm)).toISOString()
      : null,
  }));
}

export async function resumoGeral(db: Db, ownerId: string) {
  const lista = await clientesComSaldo(db, ownerId);
  return {
    totalAReceberCentavos: lista.reduce((total, cliente) => total + cliente.saldoCentavos, 0),
    clientesComSaldo: lista.filter((cliente) => cliente.saldoCentavos > 0).length,
  };
}

export async function listarClientes(
  db: Db,
  ownerId: string,
  opts: { q?: string; filtro?: FiltroClientes; pagina?: number; porPagina?: number } = {},
) {
  const pagina = Math.max(opts.pagina ?? 1, 1);
  const porPagina = Math.min(Math.max(opts.porPagina ?? 50, 1), 200);
  const busca = normalizarBusca(opts.q ?? "");
  const itens = (await clientesComSaldo(db, ownerId))
    .filter((cliente) => !busca || normalizarBusca(cliente.nome).includes(busca))
    .filter((cliente) => opts.filtro !== "abertos" || cliente.saldoCentavos > 0)
    .filter((cliente) => opts.filtro !== "quitados" || cliente.saldoCentavos === 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { itens: itens.slice((pagina - 1) * porPagina, pagina * porPagina), total: itens.length, pagina, porPagina };
}

export async function sugerirClientes(db: Db, ownerId: string, q: string, limite = 8) {
  return normalizarBusca(q) ? (await listarClientes(db, ownerId, { q, filtro: "todos", porPagina: limite })).itens : [];
}

export interface MovimentoDetalhe {
  id: number;
  tipo: TipoMovimentacao;
  valorCentavos: number;
  descricao: string | null;
  motivo: string | null;
  registradoEm: string;
  movimentacaoOriginalId: number | null;
  revertidoPorId: number | null;
  podeReverter: boolean;
  motivoBloqueio: string | null;
}

export async function detalheCliente(db: Db, ownerId: string, clienteId: number) {
  const [cliente] = await db.select().from(clientes).where(and(eq(clientes.ownerId, ownerId), eq(clientes.id, clienteId)));
  if (!cliente) throw new DomainError("NAO_ENCONTRADO", "Cliente não encontrado.");

  const movimentos = await db
    .select()
    .from(movimentacoes)
    .where(and(eq(movimentacoes.ownerId, ownerId), eq(movimentacoes.clienteId, clienteId)))
    .orderBy(desc(movimentacoes.registradoEm), desc(movimentacoes.id));
  const saldoCentavos = movimentos.reduce(
    (saldo, movimento) => saldo + (["COMPRA", "ESTORNO_PAGAMENTO"].includes(movimento.tipo) ? movimento.valorCentavos : -movimento.valorCentavos),
    0,
  );
  const reversoes = new Map<number, number>();
  for (const movimento of movimentos) if (movimento.movimentacaoOriginalId !== null) reversoes.set(movimento.movimentacaoOriginalId, movimento.id);

  return {
    cliente: { id: cliente.id, nome: cliente.nome, criadoEm: cliente.criadoEm.toISOString() },
    saldoCentavos,
    movimentos: movimentos.map((movimento): MovimentoDetalhe => ({
      id: movimento.id,
      tipo: movimento.tipo,
      valorCentavos: movimento.valorCentavos,
      descricao: movimento.descricao,
      motivo: movimento.motivo,
      registradoEm: movimento.registradoEm.toISOString(),
      movimentacaoOriginalId: movimento.movimentacaoOriginalId,
      revertidoPorId: reversoes.get(movimento.id) ?? null,
      podeReverter: (movimento.tipo === "COMPRA" || movimento.tipo === "PAGAMENTO") && !reversoes.has(movimento.id),
      motivoBloqueio: null,
    })),
  };
}
