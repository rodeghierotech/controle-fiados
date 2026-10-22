import { expect, it } from "vitest";
import { selecionarBackupParaDownload } from "@/server/services/backups";

const dono = "00000000-0000-4000-8000-000000000001";
const outroDono = "00000000-0000-4000-8000-000000000002";
const backup = { id: 7, ownerId: dono, objeto: "owners/1/backup.json", criadoEm: new Date("2026-10-22T00:00:00.000Z"), tamanhoBytes: 256, checksum: "a".repeat(64) };

it("não seleciona um backup que pertence a outro administrador", () => {
  expect(selecionarBackupParaDownload(backup, outroDono)).toBeNull();
});

it("libera somente o objeto do backup do administrador autenticado", () => {
  expect(selecionarBackupParaDownload(backup, dono)).toEqual(backup);
});
