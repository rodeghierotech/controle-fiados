"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function BuscaFiltros({ q, filtro }: { q: string; filtro: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(q);
  const primeira = useRef(true);

  function navegar(novoQ: string, novoFiltro: string) {
    const p = new URLSearchParams(params.toString());
    if (novoQ) p.set("q", novoQ);
    else p.delete("q");
    if (novoFiltro && novoFiltro !== "abertos") p.set("filtro", novoFiltro);
    else p.delete("filtro");
    p.delete("pagina");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = setTimeout(() => navegar(texto.trim(), filtro), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Buscar cliente"
          placeholder="Buscar cliente pelo nome"
          className="h-12 rounded-xl pl-11 text-base"
          value={texto}
          maxLength={120}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      <Tabs value={filtro} onValueChange={(v) => navegar(texto.trim(), v)}>
        <TabsList className="h-12 w-full sm:w-auto">
          <TabsTrigger value="abertos" className="flex-1 px-4">Em aberto</TabsTrigger>
          <TabsTrigger value="todos" className="flex-1 px-4">Todos</TabsTrigger>
          <TabsTrigger value="quitados" className="flex-1 px-4">Quitados</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
