import { formatMoney } from "@/lib/money";

export interface DadosComprovante {
  tipo: "Compra" | "Pagamento" | "Cancelamento de compra" | "Estorno de pagamento";
  cliente: string;
  valorCentavos: number;
  saldoCentavos: number;
  ocorridoEm: string;
  descricao?: string | null;
  motivo?: string | null;
}

function escaparHtml(valor: string) {
  const entidades: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return valor.replace(/[&<>\"']/g, (caractere) => entidades[caractere] ?? caractere);
}

export function prepararComprovante(): Window | null {
  return window.open("", "_blank", "popup,width=420,height=700");
}

export function imprimirComprovante(janela: Window | null, dados: DadosComprovante) {
  if (!janela) return false;

  const detalhes = [
    dados.descricao ? ["Descrição", dados.descricao] : null,
    dados.motivo ? ["Motivo", dados.motivo] : null,
  ].filter((item): item is [string, string] => item !== null);
  const dataHora = new Date(dados.ocorridoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const linhas = detalhes.map(([rotulo, valor]) => `<div class="linha"><span>${escaparHtml(rotulo)}</span><strong>${escaparHtml(valor)}</strong></div>`).join("");

  janela.document.open();
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><title>Comprovante BPC</title><style>
    * { box-sizing: border-box; } body { margin: 0; color: #2d1712; font-family: Arial, sans-serif; } main { width: 80mm; padding: 5mm; margin: 0 auto; } header { text-align: center; border-bottom: 1px dashed #9a7668; padding-bottom: 3mm; } img { width: 15mm; height: 15mm; object-fit: contain; display: block; margin: 0 auto 1mm; } h1 { margin: 0; font-size: 13px; } p { margin: 1mm 0; font-size: 11px; } .tipo { margin: 4mm 0 2mm; color: #b94d20; font-size: 12px; font-weight: bold; text-align: center; text-transform: uppercase; } .linha { display: flex; justify-content: space-between; gap: 3mm; border-bottom: 1px dashed #d2b8a9; padding: 2mm 0; font-size: 11px; } .linha span { color: #69443a; } .linha strong { max-width: 56%; text-align: right; word-break: break-word; } .total { margin-top: 4mm; border: 1px solid #ed7f2d; border-radius: 4px; padding: 3mm; text-align: center; } .total strong { display: block; font-size: 15px; margin-top: 1mm; } footer { color: #69443a; font-size: 9px; margin-top: 5mm; padding-bottom: 2mm; text-align: center; } @media print { @page { margin: 0; size: 80mm auto; } main { margin: 0; } }
  </style></head><body><main><header><img src="${window.location.origin}/logo-bpc.jpeg" alt="Bom Pra Cachorro" /><h1>Bom Pra Cachorro Pet Shop</h1><p>Comprovante de operação</p></header><p class="tipo">${escaparHtml(dados.tipo)}</p><div class="linha"><span>Cliente</span><strong>${escaparHtml(dados.cliente)}</strong></div><div class="linha"><span>Data e hora</span><strong>${dataHora}</strong></div>${linhas}<div class="linha"><span>Valor da operação</span><strong>${formatMoney(dados.valorCentavos)}</strong></div><div class="total">Saldo em aberto após a operação<strong>${formatMoney(dados.saldoCentavos)}</strong></div><footer>Obrigado pela preferência!</footer></main><script>window.onload=()=>{window.focus();window.print()};window.onafterprint=()=>window.close();<\/script></body></html>`);
  janela.document.close();
  return true;
}
