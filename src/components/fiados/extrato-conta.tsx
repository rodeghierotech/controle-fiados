"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatarDataHora } from "@/lib/format";

type TipoMovimento = "COMPRA" | "PAGAMENTO" | "REVERSAO_COMPRA" | "ESTORNO_PAGAMENTO";

interface MovimentoExtrato {
  id: number;
  tipo: TipoMovimento;
  valorCentavos: number;
  descricao: string | null;
  motivo: string | null;
  registradoEm: string;
}

interface Props {
  clienteNome: string;
  saldoCentavos: number;
  movimentos: MovimentoExtrato[];
}

const ROTULO: Record<TipoMovimento, string> = {
  COMPRA: "Compra",
  PAGAMENTO: "Pagamento",
  REVERSAO_COMPRA: "Cancelamento de compra",
  ESTORNO_PAGAMENTO: "Estorno de pagamento",
};

function escaparHtml(valor: string) {
  const entidades: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return valor.replace(/[&<>"']/g, (caractere) => entidades[caractere] ?? caractere);
}

export function ExtratoConta({ clienteNome, saldoCentavos, movimentos }: Props) {
  function imprimir() {
    const janela = window.open("", "_blank", "popup,width=760,height=700");
    if (!janela) return;

    const linhas = movimentos.map((m) => {
      const aumentaDivida = m.tipo === "COMPRA" || m.tipo === "ESTORNO_PAGAMENTO";
      const detalhes = [m.descricao, m.motivo ? `Motivo: ${m.motivo}` : null].filter(Boolean).map((texto) => escaparHtml(texto!)).join("<br />");
      return `<article class="mov"><div class="mov-cab"><strong>${ROTULO[m.tipo]}</strong><span class="valor ${aumentaDivida ? "debito" : "credito"}">${aumentaDivida ? "+" : "−"} ${formatMoney(m.valorCentavos)}</span></div><time>${formatarDataHora(m.registradoEm)}</time>${detalhes ? `<small>${detalhes}</small>` : ""}</article>`;
    }).join("");
    const emitidoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    janela.document.open();
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><title>Extrato - ${escaparHtml(clienteNome)}</title><style>
      * { box-sizing: border-box; } body { margin: 0; color: #2d1712; font-family: Arial, sans-serif; } main { width: 80mm; margin: 0 auto; padding: 5mm; } header { text-align: center; border-bottom: 1px dashed #9a7668; padding-bottom: 3mm; } img { width: 15mm; height: 15mm; object-fit: contain; display: block; margin: 0 auto 1mm; } h1 { margin: 0; font-size: 13px; } p { margin: 1mm 0; font-size: 11px; } .muted { color: #69443a; font-size: 9px; } .cliente { margin-top: 3mm; word-break: break-word; } .saldo { margin: 4mm 0 3mm; border: 1px solid #ed7f2d; border-radius: 4px; padding: 3mm; text-align: center; } .saldo span { color: #69443a; font-size: 10px; } .saldo strong { display: block; font-size: 15px; margin-top: 1mm; } .titulo-lista { border-bottom: 1px dashed #9a7668; color: #69443a; font-size: 10px; margin: 3mm 0 0; padding-bottom: 2mm; text-align: center; text-transform: uppercase; } .mov { border-bottom: 1px dashed #d2b8a9; padding: 2.5mm 0; page-break-inside: avoid; } .mov-cab { display: flex; gap: 3mm; justify-content: space-between; font-size: 11px; } time, small { display: block; color: #69443a; font-size: 9px; margin-top: 1mm; } .valor { text-align: right; white-space: nowrap; } .debito { color: #7c3a16; } .credito { color: #166534; } footer { color: #69443a; font-size: 9px; margin-top: 5mm; padding-bottom: 2mm; text-align: center; } @media print { @page { margin: 0; size: 80mm auto; } main { margin: 0; } }
    </style></head><body><main><header><img src="${window.location.origin}/logo-bpc.jpeg" alt="Bom Pra Cachorro" /><h1>Bom Pra Cachorro Pet Shop</h1><p>Extrato de conta</p><p class="muted">Emitido em ${emitidoEm}</p></header><p class="cliente"><strong>Cliente:</strong> ${escaparHtml(clienteNome)}</p><div class="saldo"><span>Saldo em aberto atual</span><strong>${formatMoney(saldoCentavos)}</strong></div><p class="titulo-lista">Movimentações</p>${linhas}<footer>Extrato com ${movimentos.length} ${movimentos.length === 1 ? "operação" : "operações"}.</footer></main><script>window.onload=()=>{window.focus();window.print()};window.onafterprint=()=>window.close();<\/script></body></html>`);
    janela.document.close();
  }

  return (
    <Button variant="outline" size="sm" onClick={imprimir}>
      <Printer aria-hidden /> Imprimir extrato
    </Button>
  );
}
