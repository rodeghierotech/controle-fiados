import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AcoesRapidas } from "@/components/fiados/acoes-rapidas";
import { BuscaFiltros } from "@/components/fiados/busca-filtros";
import { PainelPrivacidade } from "@/components/fiados/painel-privacidade";
import { getDb } from "@/server/db/connection";
import { requireSession } from "@/server/auth/require-session";
import { listarClientes, resumoGeral, type FiltroClientes } from "@/server/services/consultas";

export const dynamic = "force-dynamic";

const FILTROS: FiltroClientes[] = ["abertos", "todos", "quitados"];

export default async function Inicio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = um(sp.q).slice(0, 120);
  const filtro = (FILTROS as string[]).includes(um(sp.filtro)) ? (um(sp.filtro) as FiltroClientes) : "abertos";
  const paginaBruta = Number(um(sp.pagina));
  const pagina = Number.isInteger(paginaBruta) && paginaBruta > 0 ? paginaBruta : 1;

  const { userId } = await requireSession();
  const ctx = getDb();
  const resumo = await resumoGeral(ctx, userId);
  const lista = await listarClientes(ctx, userId, { q, filtro, pagina, porPagina: 50 });
  const totalPaginas = Math.max(1, Math.ceil(lista.total / lista.porPagina));
  const semNenhumCliente = lista.total === 0 && !q && filtro === "todos";

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filtro !== "abertos") params.set("filtro", filtro);
    if (p > 1) params.set("pagina", String(p));
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="space-y-6">
      <PainelPrivacidade
        totalAReceberCentavos={resumo.totalAReceberCentavos}
        clientesComSaldo={resumo.clientesComSaldo}
        clientes={lista.itens}
        semNenhumCliente={semNenhumCliente}
        filtro={filtro}
        q={q}
      >
        <AcoesRapidas />
        <BuscaFiltros q={q} filtro={filtro} />
      </PainelPrivacidade>

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Paginação">
          {lista.pagina > 1 ? (
            <Button asChild variant="outline" size="sm"><Link href={href(lista.pagina - 1)}>Anterior</Link></Button>
          ) : <span />}
          <span className="text-muted-foreground">Página {lista.pagina} de {totalPaginas} · {lista.total} clientes</span>
          {lista.pagina < totalPaginas ? (
            <Button asChild variant="outline" size="sm"><Link href={href(lista.pagina + 1)}>Próxima</Link></Button>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
