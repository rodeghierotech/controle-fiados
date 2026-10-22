import { describe, expect, it } from "vitest";
import { ehArquivoPublico, verificarMutacao } from "@/lib/origem";

const base = {
  host: "controle-fiados.vercel.app",
  origin: "https://controle-fiados.vercel.app",
  secFetchSite: "same-origin",
  contentType: "application/json",
};

describe("proteção de origem publicada", () => {
  it("não aplica autenticação a arquivos estáticos públicos", () => {
    expect(ehArquivoPublico("/logo-bpc.jpeg")).toBe(true);
    expect(ehArquivoPublico("/icon.jpeg")).toBe(true);
    expect(ehArquivoPublico("/login")).toBe(false);
  });

  it("aceita JSON da própria origem", () => {
    expect(verificarMutacao(base)).toBeNull();
    expect(verificarMutacao({ ...base, contentType: "application/json; charset=utf-8" })).toBeNull();
  });

  it("recusa origem diferente e conteúdo que não seja JSON", () => {
    expect(verificarMutacao({ ...base, origin: "https://evil.example" })).toBe("origem");
    expect(verificarMutacao({ ...base, secFetchSite: "cross-site" })).toBe("origem");
    expect(verificarMutacao({ ...base, contentType: "text/plain" })).toBe("conteudo");
  });

  it("aceita o envio do formulário de login da própria origem", () => {
    expect(verificarMutacao({ ...base, path: "/login", contentType: "text/plain;charset=UTF-8" } as typeof base)).toBeNull();
  });
});
