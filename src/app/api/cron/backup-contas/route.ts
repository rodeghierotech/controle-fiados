import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/server/db/connection";
import { administradores } from "@/server/db/schema";
import { autorizarCron, criarDependenciasBackup, executarBackupAutomatico } from "@/server/services/backups";

export const runtime = "nodejs";

function respostaErro(status: number) {
  return NextResponse.json({ erro: status === 401 ? "não autorizado" : "falha ao executar backup" }, { status });
}

export async function GET(request: NextRequest) {
  if (!autorizarCron(request.headers.get("authorization"), process.env.CRON_SECRET)) return respostaErro(401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return respostaErro(500);

  try {
    const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const deps = criarDependenciasBackup(getDb(), {
      async upload(objeto, conteudo) {
        const { error } = await supabase.storage.from("backups-contas").upload(objeto, conteudo, { contentType: "application/json", upsert: false });
        if (error) throw error;
      },
      async remove(objetos) {
        const { error } = await supabase.storage.from("backups-contas").remove(objetos);
        if (error) throw error;
      },
    });
    const donos = await getDb().select({ userId: administradores.userId }).from(administradores);
    const resultados = await Promise.all(donos.map(({ userId }) => executarBackupAutomatico(deps, userId)));
    const criado = resultados.filter((resultado) => resultado.tipo === "criado").length;
    return NextResponse.json({ resultado: criado > 0 ? "criado" : "nao_devido" });
  } catch (erro) {
    console.error("backup cron falhou", erro instanceof Error ? erro.name : "erro_desconhecido");
    return respostaErro(500);
  }
}
