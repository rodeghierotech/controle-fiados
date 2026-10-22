/** Verificações de origem para mutações da aplicação publicada. */

export interface CabecalhosMutacao {
  path?: string;
  host: string | null;
  origin: string | null;
  secFetchSite: string | null;
  contentType: string | null;
}

export type MotivoRecusa = "origem" | "conteudo";

const EXTENSOES_PUBLICAS = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i;

export function ehArquivoPublico(caminho: string) {
  return EXTENSOES_PUBLICAS.test(caminho);
}

/** Mutações só valem se vierem da própria origem em JSON. */
export function verificarMutacao(h: CabecalhosMutacao): MotivoRecusa | null {
  if (h.secFetchSite && h.secFetchSite !== "same-origin" && h.secFetchSite !== "none") return "origem";
  if (h.origin) {
    try {
      if (!h.host || new URL(h.origin).host.toLowerCase() !== h.host.toLowerCase()) return "origem";
    } catch {
      return "origem";
    }
  } else if (h.secFetchSite) {
    // navegador moderno sempre envia Origin em POST; ausência com Sec-Fetch-Site é suspeita
    return "origem";
  }
  // Server Actions do Next enviam o formulário de login como texto, não JSON.
  // A origem ainda é conferida acima; somente a regra de conteúdo é dispensada.
  if (h.path !== "/login" && !/^application\/json(\s*;|$)/i.test(h.contentType ?? "")) return "conteudo";
  return null;
}
