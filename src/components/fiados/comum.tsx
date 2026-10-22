"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ApiError, novoId, postar } from "@/lib/api-client";

export function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

export function ErroCampo({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-destructive">
      {msg}
    </p>
  );
}

export function AlertaErro({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{msg}</span>
    </div>
  );
}

export function Sucesso({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center">
      <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
      <p className="text-lg font-semibold">{titulo}</p>
      {children}
    </div>
  );
}

/**
 * Controla o envio de uma operação financeira:
 *  - trava cliques repetidos (via ref, sem esperar re-render);
 *  - mantém o mesmo operacaoId enquanto não houver resposta (reenvio seguro);
 *  - gera novo id após resposta definitiva (sucesso ou recusa do servidor).
 */
export function useOperacao() {
  const [operacaoId, setOperacaoId] = useState<string>(() => novoId());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const travado = useRef(false);
  const idRef = useRef(operacaoId);
  idRef.current = operacaoId;

  const renovar = useCallback(() => {
    const id = novoId();
    idRef.current = id;
    setOperacaoId(id);
  }, []);

  const limparErro = useCallback(() => {
    setErro(null);
    setErrosCampos({});
  }, []);

  const enviar = useCallback(
    async <T,>(url: string, corpo: Record<string, unknown>): Promise<T | null> => {
      if (travado.current) return null;
      travado.current = true;
      setEnviando(true);
      setErro(null);
      setErrosCampos({});
      try {
        const r = await postar<T>(url, { ...corpo, operacaoId: idRef.current });
        renovar();
        return r;
      } catch (e) {
        if (e instanceof ApiError) {
          setErro(e.message);
          setErrosCampos(e.campos ?? {});
          if (!e.semResposta) renovar();
        } else {
          setErro("Ocorreu um erro inesperado. Tente novamente.");
        }
        return null;
      } finally {
        travado.current = false;
        setEnviando(false);
      }
    },
    [renovar],
  );

  return { operacaoId, enviando, erro, errosCampos, enviar, limparErro, setErro };
}

export function dataHoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
