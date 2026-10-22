import { NextResponse } from "next/server";
import { DomainError, traduzirErroPostgres } from "./domain/errors";

const MAX_CORPO_BYTES = 16 * 1024;

export function erroJson(e: DomainError) {
  return NextResponse.json(
    { erro: { codigo: e.codigo, mensagem: e.message, campos: e.campos } },
    { status: e.status },
  );
}

/** Converte qualquer erro em resposta segura: sem caminhos, SQL ou dados pessoais. */
export function responderErro(e: unknown) {
  if (e instanceof DomainError) return erroJson(e);
  const traduzido = traduzirErroPostgres(e);
  if (traduzido) return erroJson(traduzido);
  // Log mínimo, sem mensagem original (pode conter dados do cliente).
  const nome = e instanceof Error ? e.name : "Erro";
  const codigo = (e as { code?: string } | null)?.code ?? "-";
  console.error(`[erro] ${nome} ${codigo}`);
  return NextResponse.json(
    { erro: { codigo: "INTERNO", mensagem: "Ocorreu um erro interno. Nenhum dado foi alterado. Tente novamente." } },
    { status: 500 },
  );
}

export async function lerJson(req: Request): Promise<unknown> {
  const texto = await req.text();
  if (Buffer.byteLength(texto, "utf8") > MAX_CORPO_BYTES) {
    throw new DomainError("VALIDACAO", "Requisição grande demais.");
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new DomainError("VALIDACAO", "Requisição inválida.");
  }
}

export async function tratar(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    return responderErro(e);
  }
}
