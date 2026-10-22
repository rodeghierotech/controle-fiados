import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/connection";
import { administradores } from "@/server/db/schema";
import { DomainError } from "@/server/domain/errors";

export async function requireSession(): Promise<{ userId: string }> {
  const { data, error } = await (await criarClienteSupabaseServidor()).auth.getUser();
  if (error || !data.user) throw new DomainError("NAO_AUTENTICADO", "Faça login para continuar.");

  const [administrador] = await getDb()
    .select({ userId: administradores.userId })
    .from(administradores)
    .where(eq(administradores.userId, data.user.id));
  if (!administrador) throw new DomainError("NAO_AUTENTICADO", "Esta conta não tem acesso ao sistema.");
  return { userId: data.user.id };
}
