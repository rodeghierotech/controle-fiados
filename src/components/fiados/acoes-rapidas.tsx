"use client";

import { useState } from "react";
import { Banknote, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovaCompraDialog } from "./nova-compra-dialog";
import { PagamentoDialog } from "./pagamento-dialog";

interface Props {
  clientePredefinido?: { id: number; nome: string };
  tamanho?: "lg" | "default";
}

export function AcoesRapidas({ clientePredefinido, tamanho = "lg" }: Props) {
  const [dialogo, setDialogo] = useState<"compra" | "pagamento" | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button size={tamanho} onClick={() => setDialogo("compra")}>
          <ShoppingBag aria-hidden /> Nova compra
        </Button>
        <Button size={tamanho} variant="secondary" onClick={() => setDialogo("pagamento")} className="bg-success text-success-foreground hover:bg-success/90">
          <Banknote aria-hidden /> Registrar pagamento
        </Button>
      </div>
      <NovaCompraDialog aberto={dialogo === "compra"} onAbertoChange={(o) => setDialogo(o ? "compra" : null)} clientePredefinido={clientePredefinido} />
      <PagamentoDialog aberto={dialogo === "pagamento"} onAbertoChange={(o) => setDialogo(o ? "pagamento" : null)} clientePredefinido={clientePredefinido} />
    </>
  );
}
