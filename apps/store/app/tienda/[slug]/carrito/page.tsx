import { notFound } from "next/navigation";
import { CarritoClient } from "@/components/CarritoClient";
import { fetchTenant } from "@/lib/api";

export default async function CarritoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await fetchTenant(slug);
  if (!tenant) notFound();

  return <CarritoClient slug={slug} tenant={tenant} />;
}
