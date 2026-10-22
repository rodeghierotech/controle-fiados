import { z } from "zod";
import { LIMITES, VALOR_MAXIMO_CENTAVOS } from "@/server/domain/constants";
import { limparTexto } from "@/lib/text";

// Mensagens padrão do Zod em português (as mensagens específicas abaixo têm prioridade).
z.config(z.locales.pt());

const texto = (campo: string, max: number, min = 1) =>
  z
    .string({ error: `${campo} é obrigatório.` })
    .transform(limparTexto)
    .pipe(
      z
        .string()
        .min(min, min === 1 ? `${campo} é obrigatório.` : `${campo} deve ter ao menos ${min} caracteres.`)
        .max(max, `${campo} deve ter no máximo ${max} caracteres.`),
    );

export const operacaoIdSchema = z
  .string({ error: "Identificador da operação ausente." })
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/, "Identificador da operação inválido.");

export const centavosSchema = z
  .number({ error: "Valor inválido." })
  .int("Valor inválido.")
  .positive("O valor deve ser maior que zero.")
  .max(VALOR_MAXIMO_CENTAVOS, "Valor acima do limite permitido.");

/** Identifica o cliente: existente (id) ou novo (nome + confirmação explícita). */
export const clienteRefSchema = z.union([
  z.object({ clienteId: z.number().int().positive() }).strict(),
  z
    .object({
      novoClienteNome: texto("Nome do cliente", LIMITES.nome),
      confirmarNovoCliente: z.literal(true, { error: "Confirme a criação do novo cliente." }),
    })
    .strict(),
]);

export const compraSchema = z
  .object({
    operacaoId: operacaoIdSchema,
    cliente: clienteRefSchema,
    descricao: texto("Descrição", LIMITES.descricao),
    valorCentavos: centavosSchema,
  })
  .strict();
export type CompraInput = z.infer<typeof compraSchema>;

export const pagamentoSchema = z
  .object({
    operacaoId: operacaoIdSchema,
    clienteId: z.number().int().positive(),
    valorCentavos: centavosSchema,
  })
  .strict();
export type PagamentoInput = z.infer<typeof pagamentoSchema>;

export const reversaoSchema = z
  .object({
    operacaoId: operacaoIdSchema,
    movimentacaoId: z.number().int().positive(),
    motivo: texto("Motivo", LIMITES.motivo, 3),
  })
  .strict();
export type ReversaoInput = z.infer<typeof reversaoSchema>;

