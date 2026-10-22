"use server";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
export async function entrar(formData: FormData) { const email = String(formData.get("email") ?? "").trim(), password = String(formData.get("password") ?? ""); const { error } = await (await criarClienteSupabaseServidor()).auth.signInWithPassword({ email, password }); if (error) redirect("/login?erro=credenciais"); redirect("/"); }
