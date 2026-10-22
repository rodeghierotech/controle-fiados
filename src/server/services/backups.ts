import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { backupExecucoes, clientes, contas, movimentacoes } from "@/server/db/schema";

const INTERVALO_MS = 72 * 60 * 60 * 1000;

export type BackupContasV1 = {
  versao: 1;
  geradoEm: string;
  ownerId: string;
  clientes: unknown[];
  contas: unknown[];
  movimentacoes: unknown[];
};

export type ExecucaoBackup = { id: number; ownerId: string; objeto: string; criadoEm: Date; tamanhoBytes: number; checksum: string };
export type DadosBackup = Pick<BackupContasV1, "clientes" | "contas" | "movimentacoes">;

export type DependenciasBackup = {
  obterUltimaExecucao(ownerId: string): Promise<ExecucaoBackup | null>;
  lerDados(ownerId: string): Promise<DadosBackup>;
  registrar(execucao: Omit<ExecucaoBackup, "id">): Promise<void>;
  listarExecucoes(ownerId: string): Promise<ExecucaoBackup[]>;
  removerExecucao(id: number): Promise<void>;
  storage: {
    upload(objeto: string, conteudo: string): Promise<void>;
    remove(objetos: string[]): Promise<void>;
  };
};

export type ResultadoBackup = { tipo: "criado"; objeto: string } | { tipo: "nao_devido" };

export function selecionarBackupParaDownload(backup: ExecucaoBackup, ownerId: string) {
  return backup.ownerId === ownerId ? backup : null;
}

export function autorizarCron(cabecalho: string | null, segredo: string | undefined) {
  if (!segredo || !cabecalho) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(cabecalho);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

function nomeDoObjeto(ownerId: string, agora: Date) {
  return `owners/${ownerId}/backup-${agora.toISOString().replace(/[:.]/g, "-")}.json`;
}

function aindaNaoDevido(ultima: ExecucaoBackup | null, agora: Date) {
  return ultima !== null && agora.getTime() - ultima.criadoEm.getTime() < INTERVALO_MS;
}

export async function executarBackupAutomatico(deps: DependenciasBackup, ownerId: string, agora = new Date()): Promise<ResultadoBackup> {
  if (aindaNaoDevido(await deps.obterUltimaExecucao(ownerId), agora)) return { tipo: "nao_devido" };

  const dados = await deps.lerDados(ownerId);
  const manifesto: BackupContasV1 = { versao: 1, geradoEm: agora.toISOString(), ownerId, ...dados };
  const conteudo = JSON.stringify(manifesto);
  const objeto = nomeDoObjeto(ownerId, agora);
  const checksum = createHash("sha256").update(conteudo).digest("hex");

  await deps.storage.upload(objeto, conteudo);
  await deps.registrar({ ownerId, objeto, criadoEm: agora, tamanhoBytes: Buffer.byteLength(conteudo), checksum });

  const antigas = (await deps.listarExecucoes(ownerId)).slice(2);
  for (const antiga of antigas) {
    try {
      await deps.storage.remove([antiga.objeto]);
      await deps.removerExecucao(antiga.id);
    } catch {
      // O backup recém-criado permanece válido; a próxima execução tenta a retenção novamente.
      break;
    }
  }

  return { tipo: "criado", objeto };
}

export function criarDependenciasBackup(db: Db, storage: DependenciasBackup["storage"]): DependenciasBackup {
  return {
    async obterUltimaExecucao(ownerId) {
      return (await db.select().from(backupExecucoes).where(eq(backupExecucoes.ownerId, ownerId)).orderBy(desc(backupExecucoes.criadoEm)).limit(1))[0] ?? null;
    },
    async lerDados(ownerId) {
      return db.transaction(async (tx) => ({
        clientes: await tx.select().from(clientes).where(eq(clientes.ownerId, ownerId)),
        contas: await tx.select().from(contas).where(eq(contas.ownerId, ownerId)),
        movimentacoes: await tx.select().from(movimentacoes).where(eq(movimentacoes.ownerId, ownerId)),
      }));
    },
    async registrar(execucao) { await db.insert(backupExecucoes).values(execucao); },
    async listarExecucoes(ownerId) {
      return db.select().from(backupExecucoes).where(eq(backupExecucoes.ownerId, ownerId)).orderBy(desc(backupExecucoes.criadoEm));
    },
    async removerExecucao(id) { await db.delete(backupExecucoes).where(eq(backupExecucoes.id, id)); },
    storage,
  };
}
