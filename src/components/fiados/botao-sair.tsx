"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BotaoSair() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/signout", { method: "POST", headers: { "content-type": "application/json" } });
    router.replace("/login");
    router.refresh();
  }

  return <Button type="button" variant="outline" onClick={sair}>Sair da conta</Button>;
}
