"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  className?: string;
  height?: number;
};

export function BrandLogo({ className = "", height = 52 }: Props) {
  const [showImage, setShowImage] = useState(true);
  const h = Math.min(160, Math.max(28, height));

  if (!showImage) {
    return (
      <span
        className={`font-display inline-flex shrink-0 items-baseline whitespace-nowrap text-2xl font-bold tracking-tight sm:text-3xl ${className}`}
      >
        <span className="text-primary">Venta</span>
        <span className="text-secondary">XLink</span>
      </span>
    );
  }

  return (
    <Image
      src="/logo-ventaxlink.png"
      alt="VentaXLink"
      width={320}
      height={100}
      className={`w-auto shrink-0 object-contain object-left ${className}`}
      style={{
        height: h,
        maxHeight: h,
        width: "auto",
        maxWidth: "min(320px, 78vw)",
      }}
      priority
      onError={() => setShowImage(false)}
    />
  );
}
