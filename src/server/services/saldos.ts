import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/connection";
import { movimentacoes } from "../db/schema";
import { SQL_TIPOS_DEBITO } from "../domain/constants";
const delta = sql<number>`case when ${movimentacoes.tipo} in (${sql.raw(SQL_TIPOS_DEBITO)}) then ${movimentacoes.valorCentavos} else -${movimentacoes.valorCentavos} end`;
export async function saldoConta(db: Db, ownerId: string, contaId: number): Promise<number> { const [r] = await db.select({ s: sql<number>`coalesce(sum(${delta}),0)` }).from(movimentacoes).where(and(eq(movimentacoes.ownerId, ownerId), eq(movimentacoes.contaId, contaId))); return r?.s ?? 0; }
