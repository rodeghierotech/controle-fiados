import { expect, it } from "vitest";
import { backupExecucoes } from "@/server/db/schema";

it("expõe a tabela de execuções de backup", () => {
  expect(backupExecucoes.ownerId.name).toBe("owner_id");
  expect(backupExecucoes.objeto.name).toBe("objeto");
});
