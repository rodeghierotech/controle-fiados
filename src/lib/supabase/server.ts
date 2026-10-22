import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function criarClienteSupabaseServidor() { const store = await cookies(); const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) throw new Error("Configuração de autenticação indisponível."); return createServerClient(url, key, { cookies: { getAll: () => store.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} } } }); }
