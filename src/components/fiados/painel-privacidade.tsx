"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatarDataHora } from "@/lib/format";
import { ResumoFinanceiro } from "./resumo-financeiro";

interface ClienteLista {
  id: number;
  nome: string;
  saldoCentavos: number;
  ultimaMovimentacaoEm: string | null;
}

interface Props {
  totalAReceberCentavos: number;
  clientesComSaldo: number;
  clientes: ClienteLista[];
  semNenhumCliente: boolean;
  filtro: string;
  q: string;
  children: ReactNode;
}

export function PainelPrivacidade({ totalAReceberCentavos, clientesComSaldo, clientes, semNenhumCliente, filtro, q, children }: Props) {
  const [valoresOcultos, setValoresOcultos] = useState(false);

  return (
    <>
      <ResumoFinanceiro
        totalAReceberCentavos={totalAReceberCentavos}
        clientesComSaldo={clientesComSaldo}
        valoresOcultos={valoresOcultos}
        onValoresOcultosChange={setValoresOcultos}
      />

      {children}

      <Card className="overflow-hidden">
        {clientes.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
            {semNenhumCliente ? (
              <>
                <p className="font-medium">Nenhum cliente ainda</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Os clientes são criados automaticamente na primeira compra ou no registro do saldo inicial das fichas de papel.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Nenhum cliente encontrado</p>
                <p className="text-sm text-muted-foreground">
                  {filtro === "abertos" && !q ? "Não há contas com saldo em aberto." : "Tente outra busca ou outro filtro."}
                </p>
                {filtro !== "todos" && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={q ? `/?q=${encodeURIComponent(q)}&filtro=todos` : "/?filtro=todos"}>Ver todos os clientes</Link>
                  </Button>
                )}
              </>
            )}
          </CardContent>
        ) : (
          <ul className="divide-y">
            {clientes.map((cliente) => (
              <li key={cliente.id}>
                <Link
                  href={`/contas/${cliente.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{valoresOcultos ? "••••" : cliente.nome}</p>
                    {cliente.ultimaMovimentacaoEm && (
                      <p className="text-xs text-muted-foreground">Última movimentação: {formatarDataHora(cliente.ultimaMovimentacaoEm)}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`tabular text-lg font-semibold ${cliente.saldoCentavos === 0 ? "text-muted-foreground" : ""}`}>
                      {valoresOcultos ? "••••" : cliente.saldoCentavos === 0 ? "Quitado" : formatMoney(cliente.saldoCentavos)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
