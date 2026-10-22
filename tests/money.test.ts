import { describe, expect, it } from "vitest";
import { centavosParaTexto, formatMoney, parseMoney } from "@/lib/money";

const ok = (s: string) => {
  const r = parseMoney(s);
  return r.ok ? r.centavos : `ERRO:${r.error}`;
};

describe("parseMoney", () => {
  it("converte formatos válidos em centavos inteiros", () => {
    expect(ok("12")).toBe(1200);
    expect(ok("12,5")).toBe(1250);
    expect(ok("12,50")).toBe(1250);
    expect(ok("0,01")).toBe(1);
    expect(ok("1.234,56")).toBe(123456);
    expect(ok("R$ 1.234,56")).toBe(123456);
    expect(ok("12.5")).toBe(1250);
    expect(ok("19,90")).toBe(1990);
    expect(ok("0,29")).toBe(29);
  });

  it("não sofre erro de ponto flutuante", () => {
    expect(ok("1,15")).toBe(115);
    expect(ok("8,2")).toBe(820);
    expect(ok("4.35")).toBe(435);
  });

  it("rejeita entradas inválidas ou ambíguas", () => {
    for (const s of ["", "0", "0,00", "-5", "abc", "1,234", "12,345", "1.234", "1,2,3", "12,", ",50x", "9999999999"]) {
      expect(String(ok(s))).toMatch(/^ERRO:|^\d+$/);
    }
    expect(String(ok(""))).toMatch(/^ERRO/);
    expect(String(ok("0"))).toMatch(/^ERRO/);
    expect(String(ok("-5"))).toMatch(/^ERRO/);
    expect(String(ok("12,345"))).toMatch(/^ERRO/);
    expect(String(ok("1.234"))).toMatch(/^ERRO/);
    expect(String(ok("1,2,3"))).toMatch(/^ERRO/);
    expect(String(ok("9999999999"))).toMatch(/^ERRO/);
  });

  it("formata moeda", () => {
    expect(formatMoney(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(centavosParaTexto(1250)).toBe("12,50");
    expect(centavosParaTexto(5)).toBe("0,05");
  });
});
