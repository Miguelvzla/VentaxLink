import { PlatformAuthGate } from "@/components/PlatformAuthGate";

export default function PlatformResetClavesLayout({ children }: { children: React.ReactNode }) {
  return <PlatformAuthGate>{children}</PlatformAuthGate>;
}
