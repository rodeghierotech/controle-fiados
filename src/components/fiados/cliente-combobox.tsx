"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plus, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { formatarDataHora } from "@/lib/format";
import { obter } from "@/lib/api-client";

export interface Sugestao {
  id: number;
  nome: string;
  saldoCentavos: number;
  ultimaMovimentacaoEm: string | null;
}

export type ClienteEscolhido =
  | { tipo: "existente"; id: number; nome: string }
  | { tipo: "novo"; nome: string }
  | null;

interface Props {
  value: ClienteEscolhido;
  onChange: (c: ClienteEscolhido) => void;
  /** Permite criar um cliente novo a partir do texto digitado (compra e saldo inicial). */
  permitirNovo: boolean;
  invalido?: boolean;
  autoFocus?: boolean;
  id?: string;
}

/**
 * Campo de nome com sugestões. Nunca seleciona nada sozinho: o usuário escolhe uma sugestão
 * ou confirma explicitamente a criação de um cliente novo.
 */
export function ClienteCombobox({ value, onChange, permitirNovo, invalido, autoFocus, id }: Props) {
  const [texto, setTexto] = useState(value ? value.nome : "");
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [similares, setSimilares] = useState<Sugestao[]>([]);
  const listaId = useId();
  const raiz = useRef<HTMLDivElement>(null);

  // Busca com debounce; cancela requisições antigas.
  useEffect(() => {
    if (value || texto.trim() === "") {
      setSugestoes([]);
      setCarregando(false);
      return;
    }
    const ctrl = new AbortController();
    setCarregando(true);
    const t = setTimeout(async () => {
      try {
        const r = await obter<{ itens: Sugestao[] }>(`/api/clientes?q=${encodeURIComponent(texto)}`, ctrl.signal);
        setSugestoes(r.itens);
      } catch {
        if (!ctrl.signal.aborted) setSugestoes([]);
      } finally {
        if (!ctrl.signal.aborted) setCarregando(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [texto, value]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const textoLimpo = texto.replace(/\s+/g, " ").trim();
  const mostrarCriar = permitirNovo && !value && textoLimpo.length > 0;
  const totalOpcoes = sugestoes.length + (mostrarCriar ? 1 : 0);

  function escolher(s: Sugestao) {
    setTexto(s.nome);
    onChange({ tipo: "existente", id: s.id, nome: s.nome });
    setAberto(false);
    setAtivo(-1);
  }

  function criarNovo() {
    setSimilares(sugestoes);
    onChange({ tipo: "novo", nome: textoLimpo });
    setTexto(textoLimpo);
    setAberto(false);
    setAtivo(-1);
  }

  function aoDigitar(v: string) {
    setTexto(v);
    setSimilares([]);
    if (value) onChange(null); // editar o nome desfaz a escolha
    setAberto(true);
    setAtivo(-1);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => (totalOpcoes === 0 ? -1 : (a + 1) % totalOpcoes));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => (totalOpcoes === 0 ? -1 : (a <= 0 ? totalOpcoes - 1 : a - 1)));
    } else if (e.key === "Enter" && aberto && ativo >= 0) {
      e.preventDefault();
      const s = sugestoes[ativo];
      if (s) escolher(s);
      else if (mostrarCriar) criarNovo();
    } else if (e.key === "Escape" && aberto) {
      e.stopPropagation();
      setAberto(false);
    }
  }

  const exatos = similares.filter((s) => s.nome.trim().toLowerCase() === textoLimpo.toLowerCase());

  return (
    <div ref={raiz} className="relative">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-invalid={invalido}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={permitirNovo ? "Digite o nome do cliente" : "Buscar cliente pelo nome"}
          value={texto}
          maxLength={120}
          onChange={(e) => aoDigitar(e.target.value)}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          className={cn(invalido && "border-destructive", value && "pr-24")}
        />
        {carregando && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
        {value && (
          <span className="pointer-events-none absolute right-3 top-2.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {value.tipo === "novo" ? "Novo cliente" : "Selecionado"}
          </span>
        )}
      </div>

      {aberto && !value && textoLimpo !== "" && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg"
        >
          {sugestoes.map((s, i) => (
            <li key={s.id} role="option" aria-selected={ativo === i}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent",
                  ativo === i && "bg-accent",
                )}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => escolher(s)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-medium">{s.nome}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="tabular block">{s.saldoCentavos > 0 ? `Deve ${formatMoney(s.saldoCentavos)}` : "Sem saldo"}</span>
                  {s.ultimaMovimentacaoEm && <span className="block">Último: {formatarDataHora(s.ultimaMovimentacaoEm)}</span>}
                </span>
              </button>
            </li>
          ))}
          {sugestoes.length === 0 && !carregando && !mostrarCriar && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</li>
          )}
          {mostrarCriar && (
            <li role="option" aria-selected={ativo === sugestoes.length}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-primary hover:bg-accent",
                  ativo === sugestoes.length && "bg-accent",
                )}
                onMouseEnter={() => setAtivo(sugestoes.length)}
                onClick={criarNovo}
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span>
                  Criar novo cliente “<strong>{textoLimpo}</strong>”
                </span>
              </button>
            </li>
          )}
        </ul>
      )}

      {value?.tipo === "novo" && similares.length > 0 && (
        <p className="mt-1.5 text-xs text-warning">
          Atenção: já existem clientes com nome parecido. Confirme que este é mesmo um cliente diferente.
        </p>
      )}
      {value?.tipo === "novo" && exatos.length > 0 && (
        <p className="mt-1 text-xs text-warning">Existe um cliente com exatamente este nome (homônimo).</p>
      )}
    </div>
  );
}
