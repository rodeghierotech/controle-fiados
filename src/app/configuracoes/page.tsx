import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME, APP_VERSION } from "@/server/config";
import { requireSession } from "@/server/auth/require-session";
import { BotaoSair } from "@/components/fiados/botao-sair";
export const dynamic = "force-dynamic";
export default async function Configuracoes(){ await requireSession(); return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-3xl font-semibold">Configurações</h1><Card><CardHeader><CardTitle>Aplicação online</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="space-y-2"><p className="font-medium">{APP_NAME}</p><p className="text-muted-foreground">Versão {APP_VERSION} · dados protegidos no Supabase.</p><p className="text-muted-foreground">Backups e restaurações locais não fazem parte desta versão online.</p></div><BotaoSair /></CardContent></Card></div>; }
