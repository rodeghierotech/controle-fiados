import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_VERSION } from "@/server/config";
import { requireSession } from "@/server/auth/require-session";
import { BotaoSair } from "@/components/fiados/botao-sair";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/connection";
import { backupExecucoes } from "@/server/db/schema";
export const dynamic = "force-dynamic";

function tamanhoLegivel(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
}

export default async function Configuracoes() {
  const { userId } = await requireSession();
  const backups = await getDb().select().from(backupExecucoes).where(eq(backupExecucoes.ownerId, userId)).orderBy(desc(backupExecucoes.criadoEm)).limit(2);
  const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

  return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-3xl font-semibold">Configurações</h1><Card><CardHeader><CardTitle>Backups das contas</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{backups.length === 0 ? <p className="text-muted-foreground">Ainda não há backup disponível. O primeiro será criado automaticamente na próxima execução programada.</p> : backups.map((backup) => <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between" key={backup.id}><div><p className="font-medium">Backup de {data.format(backup.criadoEm)}</p><p className="text-muted-foreground">{tamanhoLegivel(backup.tamanhoBytes)} · arquivo protegido</p></div><Button asChild variant="outline" size="sm"><a href={`/api/backups/${backup.id}/download`}>Baixar</a></Button></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Aplicação online</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="space-y-2"><p className="font-medium">{APP_NAME}</p><p className="text-muted-foreground">Versão {APP_VERSION} · dados protegidos no Supabase.</p><p className="text-muted-foreground">Os backups ficam privados no Supabase e mantêm somente os dois mais recentes.</p></div><BotaoSair /></CardContent></Card></div>;
}
