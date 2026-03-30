import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const platformEmail = "platform@ventaxlink.local";
  const platformPass = "platform123";
  await prisma.platformAdmin.deleteMany({ where: { email: platformEmail } });
  await prisma.platformAdmin.create({
    data: {
      email: platformEmail,
      password_hash: await bcrypt.hash(platformPass, 10),
      name: "Staff plataforma (dev)",
    },
  });
  console.log(`  Super admin: ${platformEmail} / ${platformPass} → /platform/login`);

  await prisma.tenant.deleteMany({ where: { slug: "demo" } });

  const tenant = await prisma.tenant.create({
    data: {
      slug: "demo",
      name: "Tienda Demo",
      description: "Catálogo de ejemplo para VentaXLink (desarrollo local).",
      phone: "1123456789",
      email: "demo@ventaxlink.local",
      whatsapp_number: "5491112345678",
      primary_color: "#22C55E",
      secondary_color: "#2563EB",
    },
  });

  const password_hash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      email: "admin@ventaxlink.local",
      password_hash,
      name: "Administrador demo",
      role: "OWNER",
    },
  });

  await prisma.product.createMany({
    data: [
      {
        tenant_id: tenant.id,
        name: "Remera algodón",
        slug: "remera-algodon",
        short_desc: "Remera unisex, varios talles.",
        description: "Remera de algodón peinado. Ideal para el día a día.",
        price: 18900,
        compare_price: 22000,
        stock: 25,
        is_featured: true,
        is_new: true,
        tags: ["indumentaria", "verano"],
      },
      {
        tenant_id: tenant.id,
        name: "Taza cerámica",
        slug: "taza-ceramica",
        short_desc: "350 ml, apta microondas.",
        description: "Taza de cerámica esmaltada.",
        price: 8500,
        stock: 40,
        is_new: false,
        tags: ["hogar"],
      },
    ],
  });

  const products = await prisma.product.findMany({
    where: { tenant_id: tenant.id },
    select: { id: true, slug: true },
  });

  for (const p of products) {
    await prisma.productImage.create({
      data: {
        product_id: p.id,
        url:
          p.slug === "remera-algodon"
            ? "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600"
            : "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600",
        alt: p.slug,
        is_primary: true,
        sort_order: 0,
      },
    });
  }

  console.log("Seed OK:");
  console.log("  Tenant slug=demo → tienda en /tienda/demo (store)");
  console.log("  Usuario BD: admin@ventaxlink.local / admin123 (para API/JWT futuro)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
