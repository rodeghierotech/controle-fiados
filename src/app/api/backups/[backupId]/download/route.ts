import { createClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/require-session";
import { getDb } from "@/server/db/connection";
import { backupExecucoes } from "@/server/db/schema";
import { DomainError } from "@/server/domain/errors";
import { tratar } from "@/server/http";
import { selecionarBackupParaDownload } from "@/server/services/backups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ backupId: string }> }) {
  return tratar(async () => {
    const { userId } = await requireSession();
    const { backupId } = await params;
    const id = Number(backupId);
    if (!Number.isSafeInteger(id) || id < 1) throw new DomainError("NAO_ENCONTRADO", "Backup não encontrado.");

    const [registro] = await getDb().select().from(backupExecucoes).where(and(eq(backupExecucoes.id, id), eq(backupExecucoes.ownerId, userId)));
    const backup = registro && selecionarBackupParaDownload(registro, userId);
    if (!backup) throw new DomainError("NAO_ENCONTRADO", "Backup não encontrado.");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) throw new DomainError("INTERNO", "Download de backup indisponível no momento.");
    const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.storage.from("backups-contas").createSignedUrl(backup.objeto, 60, { download: true });
    if (error || !data?.signedUrl) throw new DomainError("INTERNO", "Download de backup indisponível no momento.");

    return NextResponse.redirect(data.signedUrl);
  });
}
