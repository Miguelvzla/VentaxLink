import { PlatformAuthGate } from "@/components/PlatformAuthGate";

export default function PlatformTenantsLayout({ children }: { children: React.ReactNode }) {
  return <PlatformAuthGate>{children}</PlatformAuthGate>;
}
