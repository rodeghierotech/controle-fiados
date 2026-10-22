import { NextResponse } from "next/server";
import { getDb } from "@/server/db/connection";
import { requireSession } from "@/server/auth/require-session";
import { sugerirClientes } from "@/server/services/consultas";
import { tratar } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Somente leitura: sugestões de clientes para o campo de nome. */
export async function GET(req: Request) {
  return tratar(async () => {
    const { userId } = await requireSession();
    const q = new URL(req.url).searchParams.get("q") ?? "";
    return NextResponse.json({ itens: await sugerirClientes(getDb(), userId, q.slice(0, 120)) });
  });
}
