import { describe, expect, it } from "vitest";
import { executarBackupAutomatico, type DependenciasBackup } from "@/server/services/backups";

const dono = "00000000-0000-4000-8000-000000000001";

function criarDeps(): DependenciasBackup & { objetos: Map<string, string>; execucoes: Array<{ id: number; ownerId: string; objeto: string; criadoEm: Date; tamanhoBytes: number; checksum: string }> } {
  const objetos = new Map<string, string>();
  const execucoes: Array<{ id: number; ownerId: string; objeto: string; criadoEm: Date; tamanhoBytes: number; checksum: string }> = [];
  let proximoId = 1;
  return {
    objetos,
    execucoes,
    async obterUltimaExecucao(ownerId) {
      return execucoes.filter((item) => item.ownerId === ownerId).sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())[0] ?? null;
    },
    async lerDados(ownerId) {
      return {
        clientes: [{ id: 1, ownerId, nome: "Ana", nomeBusca: "ana", ativo: true, criadoEm: new Date("2026-01-01T00:00:00.000Z"), atualizadoEm: new Date("2026-01-01T00:00:00.000Z") }],
        contas: [{ id: 2, ownerId, clienteId: 1, criadoEm: new Date("2026-01-01T00:00:00.000Z") }],
        movimentacoes: [{ id: 3, ownerId, clienteId: 1, contaId: 2, tipo: "COMPRA", valorCentavos: 1200, descricao: "Racao", ocorridoEm: new Date("2026-01-01T00:00:00.000Z"), registradoEm: new Date("2026-01-01T00:00:00.000Z"), movimentacaoOriginalId: null, motivo: null, operacaoId: "op-1", impressaoOperacao: "nao" }],
      };
    },
    async registrar(execucao) {
      execucoes.push({ id: proximoId++, ...execucao });
    },
    async listarExecucoes(ownerId) {
      return execucoes.filter((item) => item.ownerId === ownerId).sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    },
    async removerExecucao(id) {
      const indice = execucoes.findIndex((item) => item.id === id);
      if (indice >= 0) execucoes.splice(indice, 1);
    },
    storage: {
      async upload(objeto, conteudo) { objetos.set(objeto, conteudo); },
      async remove(objetosParaRemover) { objetosParaRemover.forEach((objeto) => objetos.delete(objeto)); },
    },
  };
}

describe("backup automático", () => {
  it("só fica devido após 72 horas e guarda um manifesto do próprio dono", async () => {
    const deps = criarDeps();
    const agora = new Date("2026-10-21T05:00:00.000Z");
    deps.execucoes.push({ id: 1, ownerId: dono, objeto: "antigo.json", criadoEm: new Date(agora.getTime() - 71 * 60 * 60 * 1000 - 59 * 60 * 1000), tamanhoBytes: 1, checksum: "x" });
    await expect(executarBackupAutomatico(deps, dono, agora)).resolves.toEqual({ tipo: "nao_devido" });

    deps.execucoes[0].criadoEm = new Date(agora.getTime() - 72 * 60 * 60 * 1000);
    const resultado = await executarBackupAutomatico(deps, dono, agora);
    expect(resultado.tipo).toBe("criado");
    const manifesto = JSON.parse([...deps.objetos.values()][0]!);
    expect(manifesto.ownerId).toBe(dono);
    expect(manifesto.clientes).toHaveLength(1);
    expect(manifesto.movimentacoes[0].ownerId).toBe(dono);
  });

  it("não registra nem remove backups existentes se o upload falhar", async () => {
    const deps = criarDeps();
    deps.execucoes.push({ id: 1, ownerId: dono, objeto: "preservado.json", criadoEm: new Date("2026-10-15T00:00:00.000Z"), tamanhoBytes: 1, checksum: "x" });
    deps.objetos.set("preservado.json", "{}" );
    deps.storage.upload = async () => { throw new Error("storage indisponível"); };
    await expect(executarBackupAutomatico(deps, dono, new Date("2026-10-21T05:00:00.000Z"))).rejects.toThrow("storage indisponível");
    expect(deps.execucoes).toHaveLength(1);
    expect(deps.objetos.has("preservado.json")).toBe(true);
  });

  it("retém somente os dois backups mais recentes", async () => {
    const deps = criarDeps();
    for (const dia of [1, 4, 7]) await executarBackupAutomatico(deps, dono, new Date(`2026-10-${String(dia).padStart(2, "0")}T05:00:00.000Z`));
    expect(deps.execucoes).toHaveLength(2);
    expect(deps.objetos).toHaveLength(2);
  });
});
