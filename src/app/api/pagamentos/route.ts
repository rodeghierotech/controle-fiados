import { NextResponse } from "next/server";
import { getDb } from "@/server/db/connection";
import { requireSession } from "@/server/auth/require-session";
import { registrarPagamento } from "@/server/services/lancamentos";
import { lerJson, tratar } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  return tratar(async () => {
    const { userId } = await requireSession();
    const corpo = await lerJson(req);
    const resultado = await registrarPagamento(getDb(), userId, corpo);
    return NextResponse.json(resultado, { status: resultado.repetida ? 200 : 201 });
  });
}
