export type CodigoErro =
  | "NAO_AUTENTICADO"
  | "VALIDACAO"
  | "NAO_ENCONTRADO"
  | "SALDO_INSUFICIENTE"
  | "JA_REVERTIDO"
  | "REVERSAO_INVALIDA"
  | "OPERACAO_CONFLITANTE"
  | "CONFIRMACAO_NECESSARIA"
  | "BANCO_OCUPADO"
  | "ORIGEM_INVALIDA"
  | "INTERNO";

const STATUS: Record<CodigoErro, number> = {
  NAO_AUTENTICADO: 401,
  VALIDACAO: 400,
  NAO_ENCONTRADO: 404,
  SALDO_INSUFICIENTE: 422,
  JA_REVERTIDO: 409,
  REVERSAO_INVALIDA: 422,
  OPERACAO_CONFLITANTE: 409,
  CONFIRMACAO_NECESSARIA: 400,
  BANCO_OCUPADO: 503,
  ORIGEM_INVALIDA: 403,
  INTERNO: 500,
};

/** Erro de regra de negócio: a mensagem é segura para exibir ao usuário. */
export class DomainError extends Error {
  readonly codigo: CodigoErro;
  readonly status: number;
  readonly campos?: Record<string, string>;

  constructor(codigo: CodigoErro, mensagem: string, campos?: Record<string, string>) {
    super(mensagem);
    this.name = "DomainError";
    this.codigo = codigo;
    this.status = STATUS[codigo];
    this.campos = campos;
  }
}

/** Traduz falhas previsíveis do PostgreSQL sem devolver detalhes do banco. */
export function traduzirErroPostgres(err: unknown): DomainError | null {
  const code = (err as { code?: string } | null)?.code;
  if (code === "40001" || code === "40P01" || code === "55P03") {
    return new DomainError("BANCO_OCUPADO", "O sistema está processando outra operação. Tente novamente em instantes.");
  }
  if (code === "23505") return new DomainError("OPERACAO_CONFLITANTE", "Esta operação já foi registrada.");
  return null;
}
