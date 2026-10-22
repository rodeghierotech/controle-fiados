import { NextResponse } from "next/server";
import { getDb } from "@/server/db/connection";
import { requireSession } from "@/server/auth/require-session";
import { detalheCliente } from "@/server/services/consultas";
import { DomainError } from "@/server/domain/errors";
import { tratar } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Compras ativas do cliente, somente para consulta durante o pagamento. */
export async function GET(_: Request, { params }: { params: Promise<{ clienteId: string }> }) {
  return tratar(async () => {
    const { clienteId } = await params;
    if (!/^\d{1,9}$/.test(clienteId)) throw new DomainError("NAO_ENCONTRADO", "Cliente não encontrado.");

    const { userId } = await requireSession();
    const detalhe = await detalheCliente(getDb(), userId, Number(clienteId));
    const compras = detalhe.movimentos
      .filter((movimento) => movimento.tipo === "COMPRA" && movimento.revertidoPorId === null)
      .map(({ id, descricao, valorCentavos, registradoEm }) => ({ id, descricao, valorCentavos, registradoEm }));

    return NextResponse.json({ saldoCentavos: detalhe.saldoCentavos, compras });
  });
}
