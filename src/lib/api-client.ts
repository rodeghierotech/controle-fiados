export interface ErroApi {
  codigo: string;
  mensagem: string;
  campos?: Record<string, string>;
}

export class ApiError extends Error {
  readonly codigo: string;
  readonly campos?: Record<string, string>;
  /** true quando a resposta nunca chegou (rede/servidor): a operação pode ou não ter sido gravada. */
  readonly semResposta: boolean;

  constructor(e: ErroApi, semResposta = false) {
    super(e.mensagem);
    this.codigo = e.codigo;
    this.campos = e.campos;
    this.semResposta = semResposta;
  }
}

export function novoId(): string {
  const c: Crypto | undefined = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  c?.getRandomValues(bytes);
  return Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function chamar<T>(url: string, init: RequestInit): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(url, init);
  } catch {
    throw new ApiError(
      { codigo: "REDE", mensagem: "Não foi possível falar com o sistema. Verifique se ele está aberto e tente de novo — o envio não será duplicado." },
      true,
    );
  }
  let corpo: unknown = null;
  try {
    corpo = await resp.json();
  } catch {
    /* sem corpo JSON */
  }
  if (!resp.ok) {
    const erro = (corpo as { erro?: ErroApi } | null)?.erro;
    throw new ApiError(erro ?? { codigo: "INTERNO", mensagem: "Ocorreu um erro inesperado. Nenhum dado foi alterado." });
  }
  return corpo as T;
}

export function postar<T>(url: string, corpo: unknown): Promise<T> {
  return chamar<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    cache: "no-store",
  });
}

export function obter<T>(url: string, signal?: AbortSignal): Promise<T> {
  return chamar<T>(url, { method: "GET", cache: "no-store", signal });
}
