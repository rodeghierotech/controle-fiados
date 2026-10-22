import { VALOR_MAXIMO_CENTAVOS } from "@/server/domain/constants";

export type ParseMoneyResult = { ok: true; centavos: number } | { ok: false; error: string };

/**
 * Converte texto digitado (formato brasileiro) em centavos inteiros, sem ponto flutuante.
 * Aceita: "12", "12,5", "12,50", "1.234,56", "R$ 12,50", "12.50" (ponto com 1–2 casas).
 * Rejeita: mais de 2 casas decimais, negativos, vazios, formatos ambíguos como "1.234".
 */
export function parseMoney(input: string): ParseMoneyResult {
  const raw = (input ?? "").replace(/R\$/gi, "").replace(/\s+/g, "");
  if (raw === "") return { ok: false, error: "Informe o valor." };
  if (raw.startsWith("-")) return { ok: false, error: "O valor deve ser positivo." };

  let inteiro: string;
  let decimal = "";

  if (raw.includes(",")) {
    const partes = raw.split(",");
    if (partes.length !== 2) return { ok: false, error: "Valor inválido." };
    const [i, d] = partes as [string, string];
    if (d.length > 2) return { ok: false, error: "Use no máximo duas casas decimais." };
    if (!/^\d*$/.test(d)) return { ok: false, error: "Valor inválido." };
    if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(i)) return { ok: false, error: "Valor inválido." };
    inteiro = i.replace(/\./g, "");
    decimal = d;
  } else if (raw.includes(".")) {
    const partes = raw.split(".");
    const ultimo = partes[partes.length - 1] as string;
    if (partes.length === 2 && /^\d+$/.test(partes[0] as string) && /^\d{1,2}$/.test(ultimo)) {
      inteiro = partes[0] as string;
      decimal = ultimo;
    } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      return { ok: false, error: "Valor ambíguo. Use vírgula para os centavos (ex.: 1.234,00)." };
    } else {
      return { ok: false, error: "Valor inválido." };
    }
  } else {
    if (!/^\d+$/.test(raw)) return { ok: false, error: "Valor inválido." };
    inteiro = raw;
  }

  if (inteiro.length > 9) return { ok: false, error: "Valor acima do limite permitido." };
  const centavos = Number(inteiro) * 100 + Number((decimal + "00").slice(0, 2));
  if (!Number.isSafeInteger(centavos)) return { ok: false, error: "Valor inválido." };
  if (centavos <= 0) return { ok: false, error: "O valor deve ser maior que zero." };
  if (centavos > VALOR_MAXIMO_CENTAVOS) return { ok: false, error: "Valor acima do limite permitido." };
  return { ok: true, centavos };
}

/** Converte um valor único ou a soma de valores em centavos, sem ponto flutuante. */
export function parseMoneySum(input: string): ParseMoneyResult {
  const parcelas = (input ?? "").split("+");
  if (parcelas.length === 1) return parseMoney(input);

  let centavos = 0;
  for (const parcela of parcelas) {
    const valor = parseMoney(parcela.trim());
    if (!valor.ok) return valor;
    centavos += valor.centavos;
    if (!Number.isSafeInteger(centavos) || centavos > VALOR_MAXIMO_CENTAVOS) {
      return { ok: false, error: "Valor acima do limite permitido." };
    }
  }

  return { ok: true, centavos };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos inteiros como moeda brasileira, sem passar por ponto flutuante na aritmética. */
export function formatMoney(centavos: number): string {
  return brl.format(centavos / 100);
}

/** Texto editável (ex.: "12,50") a partir de centavos. */
export function centavosParaTexto(centavos: number): string {
  const abs = Math.abs(centavos);
  const reais = Math.trunc(abs / 100);
  const cents = String(abs % 100).padStart(2, "0");
  return `${centavos < 0 ? "-" : ""}${reais},${cents}`;
}
