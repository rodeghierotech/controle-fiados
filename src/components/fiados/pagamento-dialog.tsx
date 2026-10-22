"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obter } from "@/lib/api-client";
import { formatMoney, parseMoney } from "@/lib/money";
import { ClienteCombobox, type ClienteEscolhido, type Sugestao } from "./cliente-combobox";
import { imprimirComprovante, prepararComprovante } from "./comprovante";
import { AlertaErro, ErroCampo, Linha, Sucesso, dataHoje, useOperacao } from "./comum";

interface Props {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  clientePredefinido?: { id: number; nome: string };
}

interface Resultado {
  clienteNome: string;
  valorCentavos: number;
  saldoCentavos: number;
  ocorridoEm: string;
  repetida: boolean;
}

interface CompraRegistrada {
  id: number;
  descricao: string | null;
  valorCentavos: number;
  registradoEm: string;
}

function ComprasRegistradas({ compras, carregando }: { compras: CompraRegistrada[]; carregando: boolean }) {
  if (carregando) return <p className="text-sm text-muted-foreground">Consultando compras registradas...</p>;
  if (compras.length === 0) return null;

  return (
    <section aria-label="Compras registradas" className="space-y-2">
      <p className="text-sm font-medium">Compras registradas</p>
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
        {compras.map((compra) => (
          <div key={compra.id} className="flex items-start justify-between gap-3 text-sm">
            <p className="whitespace-pre-line break-words">{compra.descricao || "Compra sem descrição"}</p>
            <span className="tabular shrink-0 font-medium">{formatMoney(compra.valorCentavos)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PagamentoDialog({ aberto, onAbertoChange, clientePredefinido }: Props) {
  const router = useRouter();
  const op = useOperacao();
  const [cliente, setCliente] = useState<ClienteEscolhido>(clientePredefinido ? { tipo: "existente", ...clientePredefinido } : null);
  const [valor, setValor] = useState("");
  const [erroCliente, setErroCliente] = useState<string | null>(null);
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [saldoEmAberto, setSaldoEmAberto] = useState<number | null>(null);
  const [carregandoSaldoEmAberto, setCarregandoSaldoEmAberto] = useState(false);
  const [compras, setCompras] = useState<CompraRegistrada[]>([]);
  const [saldoOriginal, setSaldoOriginal] = useState<number | null>(null);
  const [consultandoSaldo, setConsultandoSaldo] = useState(false);
  const [revisar, setRevisar] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const parsed = parseMoney(valor);

  useEffect(() => {
    if (!aberto) return;
    setCliente(clientePredefinido ? { tipo: "existente", ...clientePredefinido } : null);
    setValor("");
    setRevisar(false);
    setResultado(null);
    setSaldoEmAberto(null);
    setCarregandoSaldoEmAberto(false);
    setCompras([]);
    setSaldoOriginal(null);
    setErroCliente(null);
    setErroValor(null);
    op.limparErro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !cliente || cliente.tipo !== "existente") {
      setSaldoEmAberto(null);
      setCarregandoSaldoEmAberto(false);
      setCompras([]);
      return;
    }

    let ativo = true;
    setSaldoEmAberto(null);
    setCarregandoSaldoEmAberto(true);

    void obter<{ saldoCentavos: number; compras: CompraRegistrada[] }>(`/api/clientes/${cliente.id}/compras`)
      .then((resposta) => {
        if (!ativo) return;
        setSaldoEmAberto(resposta.saldoCentavos);
        setCompras(resposta.compras);
      })
      .catch(() => {
        if (!ativo) return;
        setSaldoEmAberto(null);
        setCompras([]);
      })
      .finally(() => {
        if (ativo) setCarregandoSaldoEmAberto(false);
      });

    return () => {
      ativo = false;
    };
  }, [aberto, cliente]);

  async function avancar() {
    if (!cliente || cliente.tipo !== "existente") {
      setErroCliente("Escolha um cliente.");
      return;
    }
    if (!parsed.ok) {
      setErroValor(parsed.error);
      return;
    }

    setConsultandoSaldo(true);
    try {
      const resposta = await obter<{ itens: Sugestao[] }>(`/api/clientes?q=${encodeURIComponent(cliente.nome)}`);
      const clienteAtual = resposta.itens.find((item) => item.id === cliente.id);
      if (!clienteAtual) {
        setErroCliente("Não foi possível consultar o saldo deste cliente. Tente novamente.");
        return;
      }
      setSaldoOriginal(clienteAtual.saldoCentavos);
      setRevisar(true);
    } catch {
      setErroCliente("Não foi possível consultar o saldo deste cliente. Tente novamente.");
    } finally {
      setConsultandoSaldo(false);
    }
  }

  async function confirmar() {
    if (!cliente || cliente.tipo !== "existente" || !parsed.ok) return;
    const janelaComprovante = prepararComprovante();
    const r = await op.enviar<Resultado>("/api/pagamentos", { clienteId: cliente.id, valorCentavos: parsed.centavos });
    if (r) {
      imprimirComprovante(janelaComprovante, {
        tipo: "Pagamento",
        cliente: r.clienteNome,
        valorCentavos: r.valorCentavos,
        saldoCentavos: r.saldoCentavos,
        ocorridoEm: r.ocorridoEm,
      });
      setResultado(r);
      toast.success(r.repetida ? "Pagamento já estava registrado." : "Pagamento registrado.");
      router.refresh();
    } else {
      janelaComprovante?.close();
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !op.enviando && onAbertoChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" aria-hidden /> Registrar pagamento
          </DialogTitle>
          <DialogDescription>{revisar ? "Confira os valores antes de confirmar." : "O pagamento reduz o saldo em aberto do cliente."}</DialogDescription>
        </DialogHeader>

        {!revisar && !resultado && (
          <div className="grid gap-4">
            <div>
              <Label>Cliente</Label>
              {clientePredefinido ? (
                <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm font-medium">{clientePredefinido.nome}</p>
              ) : (
                <ClienteCombobox
                  id="pgto-cliente"
                  value={cliente}
                  onChange={(c) => {
                    setCliente(c);
                    setSaldoEmAberto(null);
                    setCompras([]);
                    setErroCliente(null);
                  }}
                  permitirNovo={false}
                />
              )}
              {cliente?.tipo === "existente" && (
                <div className="mt-2 space-y-3" aria-live="polite">
                  <p className="text-sm text-muted-foreground">
                    {carregandoSaldoEmAberto ? (
                      "Consultando valor em aberto..."
                    ) : saldoEmAberto !== null ? (
                      <>Cliente deve: <strong className="tabular text-foreground">{formatMoney(saldoEmAberto)}</strong></>
                    ) : null}
                  </p>
                  <ComprasRegistradas compras={compras} carregando={carregandoSaldoEmAberto} />
                </div>
              )}
              <ErroCampo msg={erroCliente} />
            </div>
            <div>
              <Label htmlFor="pgto-valor">Valor pago (R$)</Label>
              <Input id="pgto-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
              <ErroCampo msg={erroValor} />
            </div>
            <AlertaErro msg={op.erro} />
            <DialogFooter>
              <Button variant="outline" onClick={() => onAbertoChange(false)}>Cancelar</Button>
              <Button onClick={avancar} disabled={consultandoSaldo}>
                {consultandoSaldo && <Loader2 className="animate-spin" aria-hidden />}
                Revisar
              </Button>
            </DialogFooter>
          </div>
        )}

        {revisar && !resultado && cliente && saldoOriginal !== null && (
          <div className="grid gap-4">
            <dl className="divide-y rounded-xl border px-4">
              <Linha rotulo="Cliente">{cliente.nome}</Linha>
              <Linha rotulo="Valor pago"><span className="tabular">{formatMoney(parsed.ok ? parsed.centavos : 0)}</span></Linha>
              <Linha rotulo="Valor original"><span className="tabular">{formatMoney(saldoOriginal)}</span></Linha>
              <div className="py-4 text-center">
                <dt className="text-sm font-medium text-muted-foreground">Valor restante</dt>
                <dd className="tabular mt-1 text-3xl font-bold tracking-tight text-primary">{formatMoney(Math.max(saldoOriginal - (parsed.ok ? parsed.centavos : 0), 0))}</dd>
              </div>
              <Linha rotulo="Data e hora"><span className="text-base font-semibold">{dataHoje()}</span></Linha>
            </dl>
            <ComprasRegistradas compras={compras} carregando={carregandoSaldoEmAberto} />
            <AlertaErro msg={op.erro} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevisar(false)}>Voltar</Button>
              <Button onClick={confirmar} disabled={op.enviando}>
                {op.enviando && <Loader2 className="animate-spin" aria-hidden />}
                Confirmar pagamento
              </Button>
            </DialogFooter>
          </div>
        )}

        {resultado && (
          <div className="grid gap-4">
            <Sucesso titulo={resultado.repetida ? "Pagamento já registrado" : "Pagamento registrado"}>
              <p className="font-semibold">{resultado.clienteNome}</p>
              <p className="tabular text-sm">Saldo em aberto: <strong>{formatMoney(resultado.saldoCentavos)}</strong></p>
            </Sucesso>
            <DialogFooter><Button onClick={() => onAbertoChange(false)}>Fechar</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
