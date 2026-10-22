"use client";

import { useState } from "react";
import { Printer, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { formatarDataHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReversaoDialog, type AlvoReversao } from "./reversao-dialog";
import { imprimirComprovante, prepararComprovante } from "./comprovante";

export interface MovimentoView {
  id: number;
  tipo: "COMPRA" | "PAGAMENTO" | "REVERSAO_COMPRA" | "ESTORNO_PAGAMENTO";
  valorCentavos: number;
  descricao: string | null;
  motivo: string | null;
  registradoEm: string;
  movimentacaoOriginalId: number | null;
  revertidoPorId: number | null;
  podeReverter: boolean;
  motivoBloqueio: string | null;
  saldoAposCentavos: number;
}

const ROTULO = {
  COMPRA: "Compra",
  PAGAMENTO: "Pagamento",
  REVERSAO_COMPRA: "Cancelamento de compra",
  ESTORNO_PAGAMENTO: "Estorno de pagamento",
} as const satisfies Record<MovimentoView["tipo"], string>;

const AUMENTA_DIVIDA = new Set(["COMPRA", "ESTORNO_PAGAMENTO"]);

export function Historico({ clienteNome, movimentos }: { clienteNome: string; movimentos: MovimentoView[] }) {
  const [alvo, setAlvo] = useState<AlvoReversao | null>(null);
  const [busca, setBusca] = useState("");

  const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const movimentosFiltrados = termo
    ? movimentos.filter((m) => {
      const texto = [
        ROTULO[m.tipo],
        m.descricao ?? "",
        m.motivo ?? "",
        formatarDataHora(m.registradoEm),
        formatMoney(m.valorCentavos),
        String(m.valorCentavos / 100),
      ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return texto.includes(termo);
    })
    : movimentos;

  function imprimir(movimento: MovimentoView) {
    const janelaComprovante = prepararComprovante();
    imprimirComprovante(janelaComprovante, {
      tipo: ROTULO[movimento.tipo],
      cliente: clienteNome,
      valorCentavos: movimento.valorCentavos,
      saldoCentavos: movimento.saldoAposCentavos,
      ocorridoEm: movimento.registradoEm,
      descricao: movimento.descricao,
      motivo: movimento.motivo,
    });
  }

  if (movimentos.length === 0) {
    return <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>;
  }

  return (
    <>
      <div className="border-b px-5 py-3 sm:px-3">
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por operação, descrição, data ou valor"
          aria-label="Buscar no histórico"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Data e hora</TableHead>
            <TableHead>Movimento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-40 text-right"><span className="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimentosFiltrados.map((m) => {
            const debito = AUMENTA_DIVIDA.has(m.tipo);
            const revertido = m.revertidoPorId !== null;
            const ehReversao = m.movimentacaoOriginalId !== null;
            return (
              <TableRow key={m.id} className={cn(revertido && "text-muted-foreground")}>
                <TableCell className="tabular whitespace-nowrap align-top">{formatarDataHora(m.registradoEm)}</TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("font-medium", revertido && "line-through decoration-muted-foreground/50")}>{ROTULO[m.tipo]}</span>
                    {revertido && <Badge variant="destructive">{m.tipo === "PAGAMENTO" ? "Estornado" : "Cancelado"}</Badge>}
                    {ehReversao && <Badge variant="outline">Correção do #{m.movimentacaoOriginalId}</Badge>}
                  </div>
                  {m.descricao && <p className="mt-0.5 text-sm">{m.descricao}</p>}
                  {m.motivo && <p className="mt-0.5 text-sm italic">Motivo: {m.motivo}</p>}
                </TableCell>
                <TableCell
                  className={cn("tabular whitespace-nowrap text-right align-top font-medium", !revertido && !debito && "text-success")}
                >
                  {debito ? "+" : "−"} {formatMoney(m.valorCentavos)}
                </TableCell>
                <TableCell className="text-right align-top">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => imprimir(m)} aria-label={`Imprimir ${ROTULO[m.tipo]}`} title="Imprimir operação">
                      <Printer aria-hidden />
                    </Button>
                    {m.podeReverter && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setAlvo({
                            id: m.id,
                            tipo: m.tipo as AlvoReversao["tipo"],
                            valorCentavos: m.valorCentavos,
                            descricao: m.descricao,
                          })
                        }
                      >
                        <Undo2 aria-hidden /> {m.tipo === "PAGAMENTO" ? "Estornar" : "Cancelar"}
                      </Button>
                    )}
                    {!m.podeReverter && m.motivoBloqueio && (
                      <span className="self-center text-xs text-muted-foreground" title={m.motivoBloqueio}>Bloqueado</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {movimentosFiltrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma operação encontrada para “{busca}”.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ReversaoDialog alvo={alvo} onFechar={() => setAlvo(null)} />
    </>
  );
}
