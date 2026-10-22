import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ehArquivoPublico, verificarMutacao } from "@/lib/origem";

const PUBLICOS = new Set(["/login", "/api/saude"]);

export async function middleware(req: NextRequest) {
  const caminho = req.nextUrl.pathname;
  if (ehArquivoPublico(caminho)) return NextResponse.next();

  if (req.method !== "GET" && req.method !== "HEAD") {
    const motivo = verificarMutacao({
      path: req.nextUrl.pathname,
      host: req.headers.get("host"),
      origin: req.headers.get("origin"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      contentType: req.headers.get("content-type"),
    });
    if (motivo) return NextResponse.json({ erro: { codigo: "ORIGEM_INVALIDA", mensagem: "Requisição não permitida." } }, { status: 403 });
  }

  const resposta = NextResponse.next({ request: { headers: req.headers } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return resposta;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => req.cookies.set(name, value));
        items.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !PUBLICOS.has(caminho) && !caminho.startsWith("/api/")) {
    const destino = req.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = caminho === "/" ? "" : `?next=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(destino);
  }
  if (user && caminho === "/login") {
    const destino = req.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
