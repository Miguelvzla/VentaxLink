"use client";

import { useEffect, useRef } from "react";
import { trackStoreEvent } from "@/lib/track";

type Props = { slug: string };

export function StoreVisitTracker({ slug }: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackStoreEvent(slug, "tienda_vista", { path: typeof window !== "undefined" ? window.location.pathname : "" });
  }, [slug]);

  return null;
}
