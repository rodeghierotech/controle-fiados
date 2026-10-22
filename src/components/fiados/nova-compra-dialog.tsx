"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, parseMoney } from "@/lib/money";
import { ClienteCombobox, type ClienteEscolhido } from "./cliente-combobox";
import { imprimirComprovante, prepararComprovante } from "./comprovante";
import { AlertaErro, ErroCampo, Linha, Sucesso, dataHoje, useOperacao } from "./comum";

const schema = z.object({
  descricao: z.string().trim().min(1, "Informe a descrição.").max(200, "Use no máximo 200 caracteres."),
  valor: z.string().superRefine((v, ctx) => {
    const r = parseMoney(v);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
  }),
});
type Valores = z.infer<typeof schema>;

interface ResultadoCompra {
  clienteId: number;
  clienteNome: string;
  clienteCriado: boolean;
  valorCentavos: number;
  saldoCentavos: number;
  ocorridoEm: string;
  repetida: boolean;
}

interface Props {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  clientePredefinido?: { id: number; nome: string };
}

const PADRAO: Valores = { descricao: "", valor: "" };

export function NovaCompraDialog({ aberto, onAbertoChange, clientePredefinido }: Props) {
  const router = useRouter();
  const { enviando, erro, errosCampos, enviar, limparErro } = useOperacao();
  const [passo, setPasso] = useState<"form" | "revisar" | "sucesso">("form");
  const [cliente, setCliente] = useState<ClienteEscolhido>(
    clientePredefinido ? { tipo: "existente", ...clientePredefinido } : null,
  );
  const [erroCliente, setErroCliente] = useState<string | null>(null);
  const [revisao, setRevisao] = useState<Valores | null>(null);
  const [resultado, setResultado] = useState<ResultadoCompra | null>(null);
  const [chaveCombo, setChaveCombo] = useState(0);

  const form = useForm<Valores>({ resolver: zodResolver(schema), defaultValues: PADRAO });
  const valorTexto = form.watch("valor");
  const valorParse = parseMoney(valorTexto ?? "");

  useEffect(() => {
    if (aberto) {
      setPasso("form");
      setCliente(clientePredefinido ? { tipo: "existente", ...clientePredefinido } : null);
      setErroCliente(null);
      setResultado(null);
      setChaveCombo((k) => k + 1);
      form.reset(PADRAO);
      limparErro();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function revisar(v: Valores) {
    if (!cliente) {
      setErroCliente("Escolha um cliente da lista ou confirme a criação de um novo.");
      return;
    }
    setErroCliente(null);
    limparErro();
    setRevisao(v);
    setPasso("revisar");
  }

  async function confirmar() {
    if (!revisao || !cliente) return;
    const parsed = parseMoney(revisao.valor);
    if (!parsed.ok) return;
    const janelaComprovante = prepararComprovante();
    const r = await enviar<ResultadoCompra>("/api/compras", {
      cliente: cliente.tipo === "existente" ? { clienteId: cliente.id } : { novoClienteNome: cliente.nome, confirmarNovoCliente: true },
      descricao: revisao.descricao,
      valorCentavos: parsed.centavos,
    });
    if (r) {
      imprimirComprovante(janelaComprovante, { tipo: "Compra", cliente: r.clienteNome, valorCentavos: r.valorCentavos, saldoCentavos: r.saldoCentavos, ocorridoEm: r.ocorridoEm, descricao: revisao.descricao });
      setResultado(r);
      // Se o cliente acabou de ser criado, as próximas compras usam o cadastro recém-criado.
      setCliente({ tipo: "existente", id: r.clienteId, nome: r.clienteNome });
      setPasso("sucesso");
      toast.success(r.repetida ? "Compra já estava registrada." : "Compra registrada.");
      router.refresh();
    } else {
      janelaComprovante?.close();
    }
  }

  function outraCompra() {
    form.reset(PADRAO);
    limparErro();
    setResultado(null);
    setPasso("form");
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => (enviando ? undefined : onAbertoChange(o))}>
      <DialogContent aria-describedby="compra-desc" onEscapeKeyDown={(e) => enviando && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" aria-hidden /> Nova compra
          </DialogTitle>
          <DialogDescription id="compra-desc">
            {passo === "form" && "Informe o cliente, a descrição e o valor. Data e hora são registradas automaticamente."}
            {passo === "revisar" && "Confira os dados antes de confirmar."}
            {passo === "sucesso" && "Operação concluída."}
          </DialogDescription>
        </DialogHeader>

        {passo === "form" && (
          <form onSubmit={form.handleSubmit(revisar)} className="grid gap-4" noValidate>
            <div>
              <Label htmlFor="compra-cliente" className="mb-1.5 block">Cliente</Label>
              {clientePredefinido ? (
                <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm font-medium">{clientePredefinido.nome}</p>
              ) : (
                <ClienteCombobox
                  key={chaveCombo}
                  id="compra-cliente"
                  value={cliente}
                  onChange={(c) => {
                    setCliente(c);
                    setErroCliente(null);
                  }}
                  permitirNovo
                  autoFocus
                  invalido={!!erroCliente}
                />
              )}
              <ErroCampo msg={erroCliente} />
            </div>

            <div>
              <Label htmlFor="compra-descricao" className="mb-1.5 block">Descrição</Label>
              <Input
                id="compra-descricao"
                placeholder="Ex.: Ração 10kg, banho e tosa"
                autoComplete="off"
                maxLength={200}
                aria-invalid={!!form.formState.errors.descricao}
                autoFocus={!!clientePredefinido}
                {...form.register("descricao")}
              />
              <ErroCampo msg={form.formState.errors.descricao?.message} />
            </div>

            <div>
              <Label htmlFor="compra-valor" className="mb-1.5 block">Valor (R$)</Label>
              <Input
                id="compra-valor"
                inputMode="decimal"
                placeholder="0,00"
                autoComplete="off"
                aria-invalid={!!form.formState.errors.valor}
                {...form.register("valor")}
              />
              {valorParse.ok && <p className="tabular mt-1.5 text-sm text-muted-foreground">{formatMoney(valorParse.centavos)}</p>}
              <ErroCampo msg={form.formState.errors.valor?.message} />
            </div>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>Cancelar</Button>
              <Button type="submit">Revisar</Button>
            </DialogFooter>
          </form>
        )}

        {passo === "revisar" && revisao && cliente && valorParse && (
          <div className="grid gap-4">
            <dl className="divide-y rounded-xl border px-4">
              <Linha rotulo="Cliente">
                {cliente.nome}
                {cliente.tipo === "novo" && <span className="block text-xs font-normal text-primary">Novo cliente será criado</span>}
              </Linha>
              <Linha rotulo="Descrição">{revisao.descricao}</Linha>
              <Linha rotulo="Valor">
                <span className="tabular text-base">{parseMoney(revisao.valor).ok ? formatMoney((parseMoney(revisao.valor) as { centavos: number }).centavos) : ""}</span>
              </Linha>
              <Linha rotulo="Data e hora">{dataHoje()} (automática)</Linha>
            </dl>
            <AlertaErro msg={erro ?? Object.values(errosCampos)[0] ?? null} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={enviando} onClick={() => setPasso("form")}>Voltar</Button>
              <Button type="button" disabled={enviando} onClick={confirmar} autoFocus>
                {enviando && <Loader2 className="animate-spin" aria-hidden />}
                {enviando ? "Registrando…" : "Confirmar compra"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {passo === "sucesso" && resultado && (
          <div className="grid gap-4">
            <Sucesso titulo={resultado.repetida ? "Compra já registrada" : "Compra registrada"}>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="-mt-1 text-base font-semibold">{resultado.clienteNome}</p>
              <p className="tabular mt-1 text-sm">
                Saldo em aberto: <strong>{formatMoney(resultado.saldoCentavos)}</strong>
              </p>
            </Sucesso>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>Fechar</Button>
              <Button type="button" onClick={outraCompra} autoFocus>Outra compra deste cliente</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
