"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlatformToken } from "@/lib/platform-session";

export function PlatformAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getPlatformToken()) {
      router.replace("/platform/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Cargando…
      </div>
    );
  }

  return <>{children}</>;
}
