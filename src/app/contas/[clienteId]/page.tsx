import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcoesRapidas } from "@/components/fiados/acoes-rapidas";
import { ExtratoConta } from "@/components/fiados/extrato-conta";
import { Historico } from "@/components/fiados/historico";
import { getDb } from "@/server/db/connection";
import { requireSession } from "@/server/auth/require-session";
import { detalheCliente } from "@/server/services/consultas";
import { DomainError } from "@/server/domain/errors";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DetalheCliente({ params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = await params;
  if (!/^\d{1,9}$/.test(clienteId)) notFound();

  let d;
  try {
    const { userId } = await requireSession();
    d = await detalheCliente(getDb(), userId, Number(clienteId));
  } catch (e) {
    if (e instanceof DomainError && e.codigo === "NAO_ENCONTRADO") notFound();
    throw e;
  }

  let saldoAposCentavos = d.saldoCentavos;
  const movimentos = d.movimentos.map((m) => {
    const saldoDaOperacao = saldoAposCentavos;
    const aumentaDivida = m.tipo === "COMPRA" || m.tipo === "ESTORNO_PAGAMENTO";
    saldoAposCentavos -= aumentaDivida ? m.valorCentavos : -m.valorCentavos;

    return {
      id: m.id,
      tipo: m.tipo,
      valorCentavos: m.valorCentavos,
      descricao: m.descricao,
      motivo: m.motivo,
      registradoEm: m.registradoEm,
      movimentacaoOriginalId: m.movimentacaoOriginalId,
      revertidoPorId: m.revertidoPorId,
      podeReverter: m.podeReverter,
      motivoBloqueio: m.motivoBloqueio,
      saldoAposCentavos: saldoDaOperacao,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Todos os clientes
        </Link>
        <h1 className="break-words text-3xl font-semibold tracking-tight">{d.cliente.nome}</h1>
      </div>

      <AcoesRapidas clientePredefinido={{ id: d.cliente.id, nome: d.cliente.nome }} tamanho="default" />

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Saldo em aberto</p>
          <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{formatMoney(d.saldoCentavos)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Todas as compras e pagamentos deste cliente.</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Histórico de movimentações</CardTitle>
          <ExtratoConta clienteNome={d.cliente.nome} saldoCentavos={d.saldoCentavos} movimentos={movimentos} />
        </CardHeader>
        <CardContent className="p-0 sm:px-2 sm:pb-3">
          <Historico clienteNome={d.cliente.nome} movimentos={movimentos} />
        </CardContent>
      </Card>
    </div>
  );
}
