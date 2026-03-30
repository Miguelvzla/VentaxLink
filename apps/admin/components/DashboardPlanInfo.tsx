"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, type TenantMe } from "@/lib/api";
import { getToken } from "@/lib/auth";

type MeResponse = { data: TenantMe };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: undefined,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DashboardPlanInfo() {
  const token = getToken();
  const [me, setMe] = useState<TenantMe | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getJson<MeResponse>("/tenant/me", token);
      setMe(res.data);
    } catch {
      setMe(null);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!me || (me.plan !== "PRO" && me.plan !== "WHOLESALE")) return null;

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-[#EFF6FF] to-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#1E40AF]">Plan y vigencia</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[#6B7280]">Alta del comercio</dt>
          <dd className="font-medium text-[#111827]">{formatDate(me.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#6B7280]">Vencimiento del plan</dt>
          <dd className="font-medium text-[#111827]">{formatDate(me.plan_expires_at)}</dd>
        </div>
      </dl>
    </div>
  );
}
