export const TIPOS_MOVIMENTACAO = [
  "COMPRA",
  "PAGAMENTO",
  "REVERSAO_COMPRA",
  "ESTORNO_PAGAMENTO",
] as const;

export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

/** Tipos que aumentam o saldo devedor (débitos). */
export const TIPOS_DEBITO: readonly TipoMovimentacao[] = ["COMPRA", "ESTORNO_PAGAMENTO"];
/** Tipos que reduzem o saldo devedor (créditos). */
export const TIPOS_CREDITO: readonly TipoMovimentacao[] = [
  "PAGAMENTO",
  "REVERSAO_COMPRA",
];
/** Tipos que são reversões e apontam para um lançamento original. */
export const TIPOS_REVERSAO: readonly TipoMovimentacao[] = [
  "REVERSAO_COMPRA",
  "ESTORNO_PAGAMENTO",
];

/** Qual tipo original cada reversão compensa. */
export const ORIGINAL_DA_REVERSAO: Record<string, TipoMovimentacao> = {
  REVERSAO_COMPRA: "COMPRA",
  ESTORNO_PAGAMENTO: "PAGAMENTO",
};

/** Qual reversão cabe a cada tipo original. */
export const REVERSAO_DO_ORIGINAL: Record<string, TipoMovimentacao> = {
  COMPRA: "REVERSAO_COMPRA",
  PAGAMENTO: "ESTORNO_PAGAMENTO",
};

/** Limite de valor: R$ 9.999.999,99 (evita estouro e erros de digitação absurdos). */
export const VALOR_MAXIMO_CENTAVOS = 999_999_999;

export const LIMITES = {
  nome: 120,
  descricao: 200,
  motivo: 300,
} as const;

export const SQL_TIPOS_DEBITO = TIPOS_DEBITO.map((t) => `'${t}'`).join(",");
export const SQL_TIPOS_CREDITO = TIPOS_CREDITO.map((t) => `'${t}'`).join(",");
