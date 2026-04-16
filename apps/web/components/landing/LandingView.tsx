import Link from "next/link";
import { BrandLogo } from "../BrandLogo";
import { StoreCarousel, type RecentStore } from "./StoreCarousel";

const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002";
const adminLoginUrl = `${adminUrl}/login`;
const registerBase = `${adminUrl}/register`;
const registerUrl = registerBase;
/** Alta nueva con plan preseleccionado (si ya hay sesión, el admin redirige a /dashboard/plan). */
const registerUrlStarter = `${registerBase}?plan=STARTER`;
const registerUrlPro = `${registerBase}?plan=PRO`;
const registerUrlWholesale = `${registerBase}?plan=WHOLESALE`;
const storeOrigin = process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003";
const storeDemoUrl = `${storeOrigin}/tienda/demo`;

const nav: { href: string; label: string; external?: boolean }[] = [
  { href: "/", label: "Inicio" },
  { href: "#solucion", label: "Solución" },
  { href: "#funciones", label: "Funciones" },
  { href: "#clientes", label: "Clientes" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#canales", label: "Canales y operación" },
  { href: "#stack", label: "Tranquilidad" },
  { href: "#planes", label: "Planes" },
  { href: "#faq", label: "FAQ" },
  { href: adminLoginUrl, label: "Iniciar sesión", external: true },
];

const stats = [
  { value: "Un solo link", label: "Compartís una dirección y ahí está tu catálogo y tus pedidos." },
  { value: "Solo tuyo", label: "Tu negocio no se mezcla con el de otro: datos, colores y stock aparte." },
  { value: "Crece con vos", label: "Si más adelante querés sumar más cosas, el sistema está pensado para acompañarte." },
];

const audience = [
  {
    title: "Tienda de barrio y mayorista",
    body: "Precios claros, variantes, stock y cupones. Servís al público o por volumen, sin lío.",
  },
  {
    title: "Los que venden por WhatsApp",
    body: "Mantené el ritmo de siempre, pero con pedidos y avisos más ordenados.",
  },
  {
    title: "Los que quieren orden de verdad",
    body: "Desde el panel ves en qué va cada pedido y quién hace qué, todo en un solo lugar.",
  },
];

const features = [
  {
    title: "Catálogo y tienda pública",
    body: "Cada negocio tiene su propia dirección en internet. Mostrá fotos, destacá ofertas y que te encuentren fácil.",
  },
  {
    title: "Pedidos y estados",
    body: "Marcá si está pendiente, confirmado, en preparación, listo o entregado. Nada se pierde entre mensajes.",
  },
  {
    title: "Clientes y puntos",
    body: "Llevá a tus compradores y sumá puntos o beneficios sin planillas eternas.",
  },
  {
    title: "Cupones y promos",
    body: "Hacé descuentos con código en el checkout. El cobro del pedido lo cerrás vos: transferencia, efectivo, QR o lo que ya uses con tus clientes.",
  },
  {
    title: "Sin módulo de cobro integrado",
    body: "VentaXLink no procesa pagos en la tienda: no hay pasarela propia ni Mercado Pago embebido. Recibís el pedido en el panel y acordás el pago por los canales que prefieras.",
  },
  {
    title: "Qué miró la gente",
    body: "Ves entradas a la tienda y qué interesa, para decidir mejor dónde poner esfuerzo.",
  },
];

const steps = [
  {
    n: "01",
    title: "Creás tu tienda",
    body: "Nombre, colores, teléfono y un link corto que es solo tuyo.",
  },
  { n: "02", title: "Cargás productos", body: "Fotos, precios, stock y rubros. Listo para compartir." },
  {
    n: "03",
    title: "Recibís pedidos",
    body: "El cliente compra en la tienda y vos manejás todo desde el panel.",
  },
  {
    n: "04",
    title: "Coordinás cobro y entrega",
    body: "El cliente te deja el pedido en la tienda; el pago lo cerrás con tus medios habituales. Acordás envío o retiro como ya venís haciendo.",
  },
];

const channels = [
  {
    title: "Tus medios de cobro",
    desc: "Transferencia, efectivo, alias, link de pago externo o lo que uses hoy: VentaXLink no reemplaza ni centraliza eso; vos definís cómo cobrar cada venta.",
  },
  {
    title: "WhatsApp y contacto",
    desc: "Usá tu número para confirmar pedidos, aclarar totales o pasar datos de pago. Podés sumar avisos automáticos donde aplique.",
  },
  {
    title: "Logística a tu criterio",
    desc: "Retiro en local, envío propio o mensajería: lo coordinás con el cliente fuera del checkout; el panel te ayuda a ver qué pedido va en qué estado.",
  },
];

const stackTags = [
  "Rápido en el celular",
  "Datos guardados seguro",
  "Mucha gente a la vez",
  "Copias de respaldo",
  "Siempre al día",
  "Equipo que la mejora",
];

const plans: Array<{
  name: string;
  blurb: string;
  highlight: boolean;
  ideal: string;
  priceMain: string;
  priceSub: string;
  features: string[];
  cta: { label: string; href: string };
  ctaHint: string;
}> = [
  {
    name: "Inicio",
    blurb: "Para probar el catálogo y tus primeros pedidos sin complicarte.",
    highlight: false,
    ideal: "Emprendedores, ferias y comercios que arrancan o manejan poco volumen.",
    priceMain: "$0",
    priceSub: "Gratis · sin cargo mensual · precios en pesos argentinos (ARS)",
    features: [
      "Tu tienda pública con un solo link y los colores de tu marca",
      "Hasta 20 productos en el catálogo",
      "1 foto por producto",
      "Catálogo con precios, variantes y stock",
      "Pedidos con estados claros (pendiente, confirmado, listo…)",
      "Avisos al cliente y al comercio por e-mail (configurás SMTP en el panel para enviar desde tu casilla)",
      "Panel para ver pedidos y datos básicos del negocio",
    ],
    cta: { label: "Creá tu tienda gratis", href: registerUrlStarter },
    ctaHint: "Sin tarjeta: registrás y empezás con los límites del plan Inicio.",
  },
  {
    name: "Pro",
    blurb: "Más volumen, cupones con vencimiento y métricas de tu tienda.",
    highlight: true,
    ideal: "Negocios con pedidos frecuentes que quieren promos, números y soporte.",
    priceMain: "$0",
    priceSub: "Gratis por tiempo limitado · precio regular $14.999/mes ARS",
    features: [
      "Todo lo del plan Inicio, con estos límites ampliados:",
      "De 20 a 100 productos en el catálogo",
      "Hasta 3 fotos por producto",
      "Cupones con código, % de descuento sobre el pedido y fecha de vencimiento",
      "Clientes y puntos / beneficios",
      "Métricas de acceso: qué miran más tus clientes en la tienda (visitas y productos más vistos)",
      "Soporte comercial incluido",
    ],
    cta: { label: "Activar plan Pro gratis", href: registerUrlPro },
    ctaHint: "Activamos el plan Pro sin cargo por tiempo limitado. Registrate y empezá hoy.",
  },
  {
    name: "Mayorista",
    blurb: "Pensado para quien vende por cantidad o a otras empresas, con reglas a medida.",
    highlight: false,
    ideal: "Mayoristas, distribuidores y equipos que venden por volumen o B2B.",
    priceMain: "Consultar",
    priceSub: "Cotización en ARS según productos, AFIP y soporte",
    features: [
      "Todo lo del plan Pro, más:",
      "Más de 100 productos (escala a medida)",
      "Reglas por cantidad, listas de precios o condiciones B2B (lo definimos juntos)",
      "Varios operadores o sucursales si tu operación lo requiere",
      "Reportes y vistas acordes a cómo facturás y entregás",
      "Facturación AFIP (integración o flujo según tu caso)",
      "Configuración avanzada de notificaciones por e-mail",
      "Soporte comercial prioritario",
      "Acompañamiento para migrar procesos y priorizar lo urgente",
    ],
    cta: { label: "Consultar plan Mayorista", href: registerUrlWholesale },
    ctaHint: "Escribinos con volumen aproximado y tipo de cliente; te pasamos propuesta y precio en ARS.",
  },
];

const faq = [
  {
    q: "¿Qué es VentaXLink?",
    a: "Es una forma de tener tu tienda en internet con un solo link, más un panel donde ves pedidos y clientes. Cada negocio es independiente.",
  },
  {
    q: "¿Necesito saber programar?",
    a: "No. El día a día es cargar productos, ver pedidos y coordinar la venta con tus clientes. Lo demás lo resolvemos nosotros por detrás.",
  },
  {
    q: "¿Dónde se guardan los datos?",
    a: "Queda guardado de forma segura, con copia por las dudas. Lo de tu negocio no se mezcla con lo de otro comercio.",
  },
  {
    q: "¿Puedo ver una demo?",
    a: "Sí. Tocá “Ver tienda demo” o “Tienda demo” y recorré una tienda de ejemplo como si fueras cliente.",
  },
    {
      q: "¿Cuánto cuesta cada plan?",
      a: "El plan Inicio es gratis ($0). El plan Pro está disponible sin cargo por tiempo limitado (precio regular $14.999 ARS/mes). El plan Mayorista es a medida: consultanos y te cotizamos según productos, facturación AFIP y soporte que necesites.",
    },
];

function ChevronIcon() {
  return (
    <svg
      className="landing-details-chevron h-5 w-5 shrink-0 text-muted transition-transform duration-200"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function LandingView({ recentStores = [] }: { recentStores?: RecentStore[] }) {
  return (
    <div className="min-h-screen bg-white text-[#374151]">
      {/* 1 · Navegación */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-5 sm:py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2 py-0.5">
            <BrandLogo height={88} />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0 lg:flex xl:gap-0.5">
            {nav.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-1.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surface hover:text-primary-dark xl:px-2"
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-1.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-secondary xl:px-2"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={registerUrl}
              className="hidden rounded-lg border border-primary/40 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surface sm:inline-block"
            >
              Creá tu tienda
            </Link>
            <a
              href={storeDemoUrl}
              className="hidden rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-[#374151] transition-colors hover:border-secondary hover:text-secondary sm:inline-block"
            >
              Ver demo
            </a>
            <a
              href={adminLoginUrl}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark lg:hidden"
            >
              Iniciar sesión
            </a>

            <details className="relative lg:hidden">
              <summary className="list-none cursor-pointer rounded-lg border border-gray-200 p-2 text-[#374151] [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Menú</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
                {nav.map((item) => (
                  <a
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={`block px-3 py-2 text-xs font-medium hover:bg-surface ${
                      item.external ? "font-semibold text-primary" : "text-[#374151]"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  href={registerUrl}
                  className="block px-3 py-2 text-xs font-semibold text-primary hover:bg-surface"
                >
                  Creá tu tienda
                </Link>
                <a href={storeDemoUrl} className="block px-3 py-2 text-xs font-semibold text-secondary sm:hidden">
                  Ver demo
                </a>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>
        {/* 2 · Hero */}
        <section className="relative overflow-hidden border-b border-gray-100">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,197,94,0.14),transparent),radial-gradient(ellipse_55%_45%_at_100%_10%,rgba(37,99,235,0.1),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
              Hecho para comercios de Argentina
            </p>
            <h1 className="font-display max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-[#111827] sm:text-5xl lg:text-6xl text-balance">
              Tu tienda online en{" "}
              <span className="gradient-brand-text">un solo link</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#6B7280] text-balance">
              Catálogo prolijo, pedidos ordenados y contacto claro con tus clientes. El cobro lo manejás vos, con tus medios.
            </p>
            <p className="mt-2 max-w-2xl text-lg leading-relaxed text-[#6B7280] text-balance">
              VentaXLink junta lo que necesitás para vender sin pagar de más por mil programas sueltos.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 sm:gap-4">
              <Link
                href={registerUrl}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-primary-dark hover:shadow-lg"
              >
                Creá tu tienda gratis
              </Link>
              <Link
                href={adminLoginUrl}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-primary px-6 py-3 font-semibold text-primary transition-colors hover:bg-surface"
              >
                Entrar al panel
              </Link>
              <a
                href={storeDemoUrl}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-secondary px-6 py-3 font-semibold text-secondary transition-colors hover:bg-secondary hover:text-white"
              >
                Ver tienda demo
              </a>
              <a
                href="#funciones"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-gray-200 px-6 py-3 font-semibold text-[#374151] transition-colors hover:border-secondary hover:text-secondary"
              >
                Explorar funciones
              </a>
            </div>
          </div>
        </section>

        {/* 3 · Indicadores / propuesta de valor */}
        <section className="border-b border-gray-100 bg-[#FAFAFA] py-12 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">{s.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Carrusel de tiendas recientes */}
        <div id="clientes" className="scroll-mt-24">
          <StoreCarousel stores={recentStores} />
        </div>

        {/* 4 · Para quién / problema */}
        <section id="solucion" className="scroll-mt-24 border-b border-gray-100 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl text-balance">
              Pensado para quien ya vende y quiere vender mejor
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
              Si llevás pedidos por mensaje, planillas o mil programas distintos, acá tenés catálogo, clientes y operación en
              un solo lugar.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {audience.map((a) => (
                <li
                  key={a.title}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition-shadow hover:shadow-md"
                >
                  <h3 className="font-display text-lg font-semibold text-[#111827]">{a.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{a.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5 · Funciones (acordeón nativo) */}
        <section id="funciones" className="scroll-mt-24 border-b border-gray-100 bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-bold text-[#111827] sm:text-4xl">Funciones principales</h2>
            <p className="mt-3 max-w-2xl text-[#6B7280]">Tocá cada título y se abre la explicación.</p>
            <div className="mt-10 space-y-3">
              {features.map((f) => (
                <details
                  key={f.title}
                  className="group rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-base font-semibold text-[#111827] sm:text-lg">{f.title}</span>
                    <ChevronIcon />
                  </summary>
                  <div className="border-t border-gray-100 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                    <p className="pt-4 text-sm leading-relaxed text-[#6B7280]">{f.body}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 6 · Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-bold text-[#111827] sm:text-4xl">Cómo funciona</h2>
            <p className="mt-3 max-w-2xl text-[#6B7280]">Cuatro pasos claros: cargás, compartís, vendés y entregás.</p>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="relative">
                  <span className="font-display text-4xl font-extrabold text-primary/30">{s.n}</span>
                  <h3 className="mt-2 font-display text-lg font-semibold text-[#111827]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 7 · Canales y operación */}
        <section id="canales" className="scroll-mt-24 border-y border-gray-100 bg-[#F0FDF4]/40 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-bold text-[#111827] sm:text-4xl">Canales y operación</h2>
            <p className="mt-3 max-w-2xl text-[#6B7280]">
              VentaXLink se enfoca en catálogo y pedidos. Los pagos y la logística siguen siendo los que ya usás con tu
              negocio.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {channels.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="font-display text-lg font-semibold text-[#111827]">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8 · Tranquilidad */}
        <section id="stack" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-2xl bg-brand-gradient p-[1px] shadow-lg">
              <div className="rounded-2xl bg-white px-8 py-12 sm:px-12">
                <h2 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">Tranquilidad de fondo</h2>
                <p className="mt-2 text-[#6B7280]">
                  Lo importante: que cargue bien, que no se caiga y que aguante cuando hay muchas ventas a la vez.
                </p>
                <p className="mt-2 text-[#6B7280]">Nosotros nos ocupamos de eso; vos vendé.</p>
                <div className="mt-8 flex flex-wrap gap-2 sm:gap-3">
                  {stackTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-[#374151] ring-1 ring-gray-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9 · Planes */}
        <section id="planes" className="scroll-mt-24 border-b border-gray-100 bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-bold text-[#111827] sm:text-4xl">Planes</h2>
            <p className="mt-3 max-w-2xl text-[#6B7280]">
              Tres niveles con límites claros de catálogo, fotos y funciones. Los precios están en pesos argentinos
              (ARS).
            </p>
            <p className="mt-2 max-w-2xl text-sm text-[#9CA3AF]">
              Los límites (productos, fotos, etc.) aplican según el plan contratado. Precios sujetos a actualización;
              el plan Mayorista se cotiza por caso.
            </p>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
                    p.highlight
                      ? "border-secondary bg-white shadow-lg ring-2 ring-secondary/20 lg:scale-[1.02]"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {p.highlight ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-white">
                      El más pedido
                    </span>
                  ) : null}
                  <h3 className="font-display text-xl font-bold text-[#111827]">{p.name}</h3>
                  <div className="mt-4 rounded-xl bg-surface/80 px-4 py-3 ring-1 ring-gray-100">
                    {p.name === "Pro" ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                            Gratis por tiempo limitado
                          </span>
                          <span className="text-sm font-medium text-[#9CA3AF] line-through">$14.999/mes</span>
                        </div>
                        <p className="mt-2 font-display text-4xl font-bold tracking-tight text-[#111827]">$0</p>
                      </>
                    ) : (
                      <p className="flex flex-wrap items-baseline gap-x-1 font-display text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                        <span>{p.priceMain}</span>
                      </p>
                    )}
                    <p className="mt-1.5 text-xs leading-snug text-[#6B7280]">{p.priceSub}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">{p.blurb}</p>
                  <p className="mt-2 text-xs font-medium leading-snug text-[#374151]">{p.ideal}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-gray-100 pt-5">
                    {p.features.map((line, idx) => (
                      <li key={`${p.name}-${idx}`} className="flex gap-2.5 text-sm leading-snug text-[#374151]">
                        <span className="mt-0.5 shrink-0 font-semibold text-primary" aria-hidden>
                          ✓
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 border-t border-gray-100 pt-6">
                    <Link
                      href={p.cta.href}
                      className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors ${
                        p.highlight
                          ? "bg-secondary hover:bg-secondary-dark"
                          : "bg-primary hover:bg-primary-dark"
                      }`}
                    >
                      {p.cta.label}
                    </Link>
                    <p className="mt-2 text-center text-xs leading-relaxed text-muted">{p.ctaHint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10 · FAQ + CTA */}
        <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-display text-center text-3xl font-bold text-[#111827] sm:text-4xl">
              Preguntas frecuentes
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[#6B7280]">
              Respuestas cortas. Si te queda alguna duda, preguntanos.
            </p>
            <div className="mt-10 space-y-3">
              {faq.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left [&::-webkit-details-marker]:hidden">
                    <span className="font-medium text-[#111827]">{item.q}</span>
                    <ChevronIcon />
                  </summary>
                  <p className="border-t border-gray-100 px-5 pb-5 pt-4 text-sm leading-relaxed text-[#6B7280]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 bg-gradient-to-br from-[#F0FDF4] to-[#EFF6FF] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl text-balance">
              ¿Probamos tu tienda en un link?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[#6B7280]">
              Entrá al panel, mirá cómo se ve y probá la tienda de ejemplo como cliente.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href={registerUrl}
                className="inline-flex rounded-xl bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Creá tu tienda gratis
              </Link>
              <Link
                href={adminLoginUrl}
                className="inline-flex rounded-xl border-2 border-primary bg-white px-8 py-3 font-semibold text-primary transition-colors hover:bg-surface"
              >
                Ir al panel
              </Link>
              <a
                href={storeDemoUrl}
                className="inline-flex rounded-xl border-2 border-secondary bg-white px-8 py-3 font-semibold text-secondary transition-colors hover:bg-secondary hover:text-white"
              >
                Tienda demo
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-12 text-center sm:text-left">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
          <div>
            <BrandLogo height={48} />
            <p className="mt-3 text-sm text-muted">© {new Date().getFullYear()} VentaXLink · Tu tienda en un link</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-muted sm:justify-end">
            <a href="#solucion" className="hover:text-secondary">
              Solución
            </a>
            <a href="#planes" className="hover:text-secondary">
              Planes
            </a>
            <a href={storeDemoUrl} className="hover:text-secondary">
              Demo
            </a>
            <Link href={adminLoginUrl} className="hover:text-secondary">
              Panel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
