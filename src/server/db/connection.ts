import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
type Cliente = ReturnType<typeof postgres>;
type Estado = { db: Db; cliente: Cliente };
const CHAVE = Symbol.for("controle-fiados.postgres");

function abrir(): Estado {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada.");
  const cliente = postgres(url, { prepare: false, max: 5 });
  return { cliente, db: drizzle(cliente, { schema }) };
}

export function getDb(): Db {
  const g = globalThis as unknown as Record<symbol, Estado | undefined>;
  if (!g[CHAVE]) g[CHAVE] = abrir();
  return g[CHAVE]!.db;
}

export async function withTransaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  return getDb().transaction((tx) => fn(tx as Db));
}
