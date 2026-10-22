"use client";
import { createBrowserClient } from "@supabase/ssr";
export function criarClienteSupabaseBrowser() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) throw new Error("Configuração de autenticação indisponível."); return createBrowserClient(url, key); }
