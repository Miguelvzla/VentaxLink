"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicTenant } from "@/lib/api";
import { postCheckout } from "@/lib/checkout";
import { type CartLine, getCart, removeLine, setCart, updateLineQuantity } from "@/lib/cart";

type Props = { slug: string; tenant: PublicTenant };

function formatArs(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function lineSubtotal(line: CartLine) {
  const unit = Number(line.price);
  if (Number.isNaN(unit)) return 0;
  return unit * line.quantity;
}

export function CarritoClient({ slug, tenant }: Props) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [usePointsRedeem, setUsePointsRedeem] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketplaceTerms, setMarketplaceTerms] = useState(
    "VentaXLink provee la plataforma tecnológica. La compra se realiza directamente al comercio vendedor.",
  );
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [done, setDone] = useState<{
    order_number: number;
    message: string;
    subtotal: string;
    discount_amount: string;
    total: string;
    billing_payment_alias?: string | null;
  } | null>(null);

  const canUseCoupon = tenant.plan === "PRO" || tenant.plan === "WHOLESALE";
  const canRedeemPoints =
    tenant.points_enabled === true &&
    canUseCoupon &&
    tenant.points_redeem_cost != null &&
    tenant.points_redeem_cost >= 1 &&
    tenant.points_redeem_min_balance != null &&
    tenant.points_redeem_min_balance >= 1 &&
    tenant.points_redeem_percent != null &&
    Number(tenant.points_redeem_percent) > 0;

  useEffect(() => {
    setLines(getCart(slug));
    const onUpdate = () => setLines(getCart(slug));
    window.addEventListener("ventaxlink-cart", onUpdate);
    return () => window.removeEventListener("ventaxlink-cart", onUpdate);
  }, [slug]);

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1").replace(/\/+$/, "");
    void fetch(`${base}/public/legal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { marketplace_terms?: string } } | null) => {
        const t = j?.data?.marketplace_terms?.trim();
        if (t) setMarketplaceTerms(t);
      })
      .catch(() => undefined);
  }, []);

  const total = lines.reduce((s, l) => s + lineSubtotal(l), 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (lines.length === 0) {
      setError("El carrito está vacío.");
      return;
    }
    const n = name.trim();
    const p = phone.trim();
    if (n.length < 2) {
      setError("Indicá tu nombre (al menos 2 letras).");
      return;
    }
    if (p.length < 6) {
      setError("Indicá un teléfono válido (mínimo 6 dígitos).");
      return;
    }
    if (!acceptsTerms) {
      setError("Debés aceptar los términos de compra para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postCheckout(slug, {
        items: lines.map((l) => ({ product_slug: l.product_slug, quantity: l.quantity })),
        customer_name: n,
        customer_phone: p,
        customer_email: email.trim() || undefined,
        delivery_type: deliveryType,
        customer_notes: notes.trim() || undefined,
        coupon_code: canUseCoupon && couponCode.trim() ? couponCode.trim() : undefined,
        use_points_redeem: canRedeemPoints && usePointsRedeem ? true : undefined,
        accepts_marketplace_terms: true,
      });
      setDone({
        order_number: res.data.order_number,
        message: res.data.message,
        subtotal: res.data.subtotal,
        discount_amount: res.data.discount_amount,
        total: res.data.total,
        billing_payment_alias: res.data.billing_payment_alias ?? null,
      });
      setCart(slug, []);
      setLines([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const disc = Number(done.discount_amount);
    const showDisc = Number.isFinite(disc) && disc > 0;
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-100 bg-emerald-50/80 p-8 text-center">
        <p className="font-display text-xl font-bold text-[#111827]">¡Pedido #{done.order_number} recibido!</p>
        <p className="mt-3 text-sm text-[#374151]">{done.message}</p>
        <div className="mx-auto mt-4 max-w-xs space-y-1 rounded-xl border border-emerald-200/80 bg-white/60 px-4 py-3 text-left text-sm text-[#374151]">
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Subtotal</span>
            <span>{formatArs(done.subtotal)}</span>
          </div>
          {showDisc ? (
            <div className="flex justify-between text-emerald-800">
              <span>Descuento</span>
              <span>−{formatArs(done.discount_amount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-emerald-100 pt-2 font-semibold text-[#111827]">
            <span>Total</span>
            <span>{formatArs(done.total)}</span>
          </div>
        </div>
        {done.billing_payment_alias ? (
          <div className="mx-auto mt-4 max-w-xs rounded-xl border border-emerald-200 bg-white px-4 py-3 text-left text-sm text-[#374151]">
            <p className="text-xs text-[#6B7280]">Podés transferir a este alias:</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(done.billing_payment_alias || "")}
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-900 hover:bg-emerald-100"
            >
              {done.billing_payment_alias}
            </button>
          </div>
        ) : null}
        <Link
          href={`/tienda/${slug}`}
          className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: tenant.primary_color }}
        >
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-2xl font-bold text-[#111827]">Carrito</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Revisá los productos y completá tus datos para enviar el pedido al comercio.
        </p>

        {lines.length === 0 ? (
          <p className="mt-8 text-sm text-[#9CA3AF]">
            No hay productos.{" "}
            <Link href={`/tienda/${slug}/productos`} className="font-semibold hover:underline" style={{ color: tenant.primary_color }}>
              Ver catálogo
            </Link>
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {lines.map((line) => (
              <li
                key={line.product_slug}
                className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[#111827]">{line.name}</p>
                  <p className="text-sm text-[#6B7280]">{formatArs(line.price)} c/u</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={line.track_stock ? line.stock : 999}
                    value={line.quantity}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (Number.isNaN(n)) return;
                      updateLineQuantity(slug, line.product_slug, n);
                      setLines(getCart(slug));
                    }}
                    className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  />
                  <span className="text-sm font-semibold text-[#111827]">
                    {formatArs(String(lineSubtotal(line)))}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      removeLine(slug, line.product_slug);
                      setLines(getCart(slug));
                    }}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-4 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-6">
          <h2 className="font-semibold text-[#111827]">Confirmar pedido</h2>
          <p className="mt-1 text-xs text-[#6B7280]">
            El comercio te va a contactar para coordinar pago y entrega.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Tu nombre</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Teléfono / WhatsApp</label>
              <input
                required
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Email (opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            {canUseCoupon ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">Cupón (opcional)</label>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Código"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-sm uppercase outline-none ring-[#2563EB] focus:ring-2"
                />
                <p className="mt-1 text-xs text-[#9CA3AF]">Descuento % sobre el total del pedido si el cupón es válido.</p>
              </div>
            ) : null}
            {canRedeemPoints ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={usePointsRedeem}
                    onChange={(e) => setUsePointsRedeem(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-[#111827]">Canjear puntos en este pedido</span>
                    <span className="mt-0.5 block text-xs text-[#6B7280]">
                      {tenant.points_redeem_percent}% de descuento sobre el total (después del cupón) si tenés al menos{" "}
                      {tenant.points_redeem_min_balance} puntos. Costo del canje: {tenant.points_redeem_cost} puntos. Si no
                      alcanzá el saldo, el pedido no se confirma.
                    </span>
                  </span>
                </label>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Entrega</label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as "PICKUP" | "DELIVERY")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="PICKUP">Retiro en el local</option>
                <option value="DELIVERY">Envío a domicilio</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Notas (opcional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs text-[#4B5563]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acceptsTerms}
                onChange={(e) => setAcceptsTerms(e.target.checked)}
              />
              <span>
                Confirmo que la compra es realizada al comercio <strong>{tenant.name}</strong> y no a VentaXLink.
                VentaXLink solo provee la plataforma.
              </span>
            </label>
            <p className="text-[11px] text-[#9CA3AF]">{marketplaceTerms}</p>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Total estimado</span>
                <span className="text-lg font-bold text-[#111827]">{formatArs(String(total))}</span>
              </div>
              <button
                type="submit"
                disabled={submitting || lines.length === 0}
                className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: tenant.primary_color }}
              >
                {submitting ? "Enviando…" : "Enviar pedido"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
