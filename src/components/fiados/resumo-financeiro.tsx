"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

interface Props {
  totalAReceberCentavos: number;
  clientesComSaldo: number;
  valoresOcultos: boolean;
  onValoresOcultosChange: (ocultos: boolean) => void;
}

export function ResumoFinanceiro({ totalAReceberCentavos, clientesComSaldo, valoresOcultos, onValoresOcultosChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Total a receber</p>
            <Button
              size="icon"
              variant="ghost"
              className="-mr-2 -mt-2 h-8 w-8"
              onClick={() => onValoresOcultosChange(!valoresOcultos)}
              aria-label={valoresOcultos ? "Mostrar valores financeiros" : "Ocultar valores financeiros"}
              title={valoresOcultos ? "Mostrar valores" : "Ocultar valores"}
            >
              {valoresOcultos ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
            </Button>
          </div>
          <p className="tabular mt-1 text-4xl font-semibold tracking-tight">
            {valoresOcultos ? "••••" : formatMoney(totalAReceberCentavos)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Clientes com saldo pendente</p>
          <p className="tabular mt-1 text-4xl font-semibold tracking-tight">
            {valoresOcultos ? "••••" : clientesComSaldo}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
