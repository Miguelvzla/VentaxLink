"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

type Props = { className?: string; children: React.ReactNode };

export function LogoutLink({ className, children }: Props) {
  const router = useRouter();

  return (
    <Link
      href="/login"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        clearSession();
        router.push("/login");
        router.refresh();
      }}
    >
      {children}
    </Link>
  );
}
