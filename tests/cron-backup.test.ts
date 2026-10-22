import { expect, it } from "vitest";
import { autorizarCron } from "@/server/services/backups";

it("recusa chamada cron sem o bearer secret", () => {
  expect(autorizarCron(null, "segredo-de-teste")).toBe(false);
  expect(autorizarCron("Bearer errado", "segredo-de-teste")).toBe(false);
  expect(autorizarCron("Bearer segredo-de-teste", "segredo-de-teste")).toBe(true);
});
