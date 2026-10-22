"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { AlertaErro, ErroCampo, Linha, useOperacao } from "./comum";
import { imprimirComprovante, prepararComprovante } from "./comprovante";

export interface AlvoReversao {
  id: number;
  tipo: "COMPRA" | "PAGAMENTO";
  valorCentavos: number;
  descricao: string | null;
}

const TEXTOS = {
  COMPRA: { titulo: "Cancelar compra", acao: "Cancelar compra", efeito: "O saldo devedor diminui" },
  PAGAMENTO: { titulo: "Estornar pagamento", acao: "Estornar pagamento", efeito: "O saldo devedor aumenta" },
} as const;

interface Props {
  alvo: AlvoReversao | null;
  onFechar: () => void;
}

export function ReversaoDialog({ alvo, onFechar }: Props) {
  const router = useRouter();
  const { enviando, erro, enviar, limparErro } = useOperacao();
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState<string | null>(null);

  useEffect(() => {
    setMotivo("");
    setErroMotivo(null);
    limparErro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo?.id]);

  async function confirmar() {
    if (!alvo) return;
    const m = motivo.replace(/\s+/g, " ").trim();
    if (m.length < 3) {
      setErroMotivo("Informe o motivo (mínimo de 3 caracteres).");
      return;
    }
    setErroMotivo(null);
    const janelaComprovante = prepararComprovante();
    const r = await enviar<{ clienteNome: string; valorCentavos: number; saldoCentavos: number; ocorridoEm: string; repetida: boolean }>("/api/reversoes", { movimentacaoId: alvo.id, motivo: m });
    if (r) {
      imprimirComprovante(janelaComprovante, { tipo: alvo.tipo === "COMPRA" ? "Cancelamento de compra" : "Estorno de pagamento", cliente: r.clienteNome, valorCentavos: r.valorCentavos, saldoCentavos: r.saldoCentavos, ocorridoEm: r.ocorridoEm, motivo: m });
      toast.success(alvo.tipo === "PAGAMENTO" ? "Pagamento estornado." : "Lançamento cancelado.");
      router.refresh();
      onFechar();
    } else {
      janelaComprovante?.close();
    }
  }

  const t = alvo ? TEXTOS[alvo.tipo] : TEXTOS.COMPRA;

  return (
    <Dialog open={alvo !== null} onOpenChange={(o) => (!o && !enviando ? onFechar() : undefined)}>
      <DialogContent aria-describedby="rev-desc" onEscapeKeyDown={(e) => enviando && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-destructive" aria-hidden /> {t.titulo}
          </DialogTitle>
          <DialogDescription id="rev-desc">
            O lançamento original é preservado no histórico; um registro de correção é criado com o motivo informado.
          </DialogDescription>
        </DialogHeader>
        {alvo && (
          <div className="grid gap-4">
            <dl className="divide-y rounded-xl border px-4">
              <Linha rotulo="Lançamento">{alvo.descricao || (alvo.tipo === "PAGAMENTO" ? "Pagamento" : "Compra")}</Linha>
              <Linha rotulo="Valor"><span className="tabular">{formatMoney(alvo.valorCentavos)}</span></Linha>
              <Linha rotulo="Efeito">{t.efeito} em {formatMoney(alvo.valorCentavos)}</Linha>
            </dl>
            <div>
              <Label htmlFor="rev-motivo" className="mb-1.5 block">Motivo (obrigatório)</Label>
              <Textarea
                id="rev-motivo"
                value={motivo}
                maxLength={300}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setErroMotivo(null);
                }}
                aria-invalid={!!erroMotivo}
                autoFocus
              />
              <ErroCampo msg={erroMotivo} />
            </div>
            <AlertaErro msg={erro} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={enviando} onClick={onFechar}>Voltar</Button>
              <Button type="button" variant="destructive" disabled={enviando} onClick={confirmar}>
                {enviando && <Loader2 className="animate-spin" aria-hidden />}
                {enviando ? "Registrando…" : t.acao}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
