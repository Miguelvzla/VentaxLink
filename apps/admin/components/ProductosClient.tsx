"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AdminProduct,
  type TenantMe,
  deleteJson,
  getJson,
  patchJson,
  postJson,
  postUploadProductImage,
} from "@/lib/api";
import { getStoredTenant, getToken } from "@/lib/auth";

const storeOrigin = process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003";

type ListResponse = { data: AdminProduct[] };
type MeResponse = { data: TenantMe };

type FormState = {
  id: string | null;
  name: string;
  slug: string;
  short_desc: string;
  description: string;
  price: string;
  compare_price: string;
  stock: string;
  image_urls: [string, string, string];
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  tags: string;
};

function planProductCap(plan: string): number {
  switch (plan) {
    case "PRO":
      return 100;
    case "WHOLESALE":
      return 50_000;
    default:
      return 20;
  }
}

function planMaxImages(plan: string): number {
  return plan === "PRO" || plan === "WHOLESALE" ? 3 : 1;
}

function planDisplayName(plan: string): string {
  switch (plan) {
    case "STARTER":
      return "Inicio";
    case "PRO":
      return "Pro";
    case "WHOLESALE":
      return "Mayorista";
    default:
      return plan;
  }
}

const emptyForm = (): FormState => ({
  id: null,
  name: "",
  slug: "",
  short_desc: "",
  description: "",
  price: "",
  compare_price: "",
  stock: "0",
  image_urls: ["", "", ""],
  is_active: true,
  is_featured: false,
  is_new: false,
  tags: "",
});

function productToForm(p: AdminProduct): FormState {
  const fromApi =
    p.image_urls?.length ? p.image_urls : p.primary_image_url ? [p.primary_image_url] : [];
  const image_urls: [string, string, string] = [
    fromApi[0] ?? "",
    fromApi[1] ?? "",
    fromApi[2] ?? "",
  ];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    short_desc: p.short_desc ?? "",
    description: p.description ?? "",
    price: p.price,
    compare_price: p.compare_price ?? "",
    stock: String(p.stock),
    image_urls,
    is_active: p.is_active,
    is_featured: p.is_featured,
    is_new: p.is_new,
    tags: p.tags?.length ? p.tags.join(", ") : "",
  };
}

function parseTags(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function ProductosClient() {
  const token = getToken();
  const tenant = getStoredTenant();
  const storeUrl = tenant ? `${storeOrigin}/tienda/${tenant.slug}` : null;

  const [items, setItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  /** Evita usar STARTER (1 sola imagen) hasta que llegue /tenant/me: el login ya guarda plan en localStorage. */
  const effectivePlan = plan ?? tenant?.plan ?? "STARTER";
  const fileRef0 = useRef<HTMLInputElement>(null);
  const fileRef1 = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);
  const fileRefs = [fileRef0, fileRef1, fileRef2];

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [res, me] = await Promise.all([
        getJson<ListResponse>("/products", token),
        getJson<MeResponse>("/tenant/me", token),
      ]);
      setItems(res.data);
      setPlan(me.data.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function startEdit(p: AdminProduct) {
    setForm(productToForm(p));
    setShowForm(true);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const price = Number(form.price.replace(",", "."));
    if (Number.isNaN(price) || price < 0) {
      setError("Poné un precio válido");
      return;
    }
    const stock = Number.parseInt(form.stock, 10);
    if (Number.isNaN(stock) || stock < 0) {
      setError("Poné un stock válido");
      return;
    }
    let compareNum: number | undefined;
    if (form.compare_price.trim()) {
      const c = Number(form.compare_price.replace(",", "."));
      if (Number.isNaN(c) || c < 0) {
        setError("Precio tachado inválido");
        return;
      }
      compareNum = c;
    }

    const maxImg = planMaxImages(plan ?? tenant?.plan ?? "STARTER");
    const urls = form.image_urls.slice(0, maxImg).map((u) => u.trim()).filter(Boolean);
    for (const u of urls) {
      if (!/^https?:\/\//i.test(u) && !u.startsWith("/")) {
        setError(
          "Cada foto tiene que ser una URL (http/https), una ruta que empiece con /, o subila con el botón de archivo.",
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const tags = parseTags(form.tags);
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        price,
        stock,
        is_active: form.is_active,
        is_featured: form.is_featured,
        is_new: form.is_new,
        short_desc: form.short_desc.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (form.id) {
        body.tags = tags;
      } else if (tags.length) {
        body.tags = tags;
      }
      if (compareNum != null) body.compare_price = compareNum;
      const slug = form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (slug) body.slug = slug;

      if (form.id) {
        body.image_urls = urls;
        await patchJson<{ data: AdminProduct }>(`/products/${form.id}`, token, body);
      } else {
        if (urls.length) body.image_urls = urls;
        await postJson<{ data: AdminProduct }>("/products", body, token);
      }
      setShowForm(false);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate(id: string, name: string) {
    if (!token) return;
    if (!window.confirm(`¿Dar de baja "${name}"? No se borra de la base: deja de mostrarse en la tienda.`)) {
      return;
    }
    setError(null);
    try {
      await deleteJson(`/products/${id}`, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo dar de baja");
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-[#6B7280]">
        Necesitás iniciar sesión.{" "}
        <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
          Ir al login
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Productos</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Cargá lo que vendés; se ve en tu tienda pública. Podés pegar la URL de una imagen o subir un archivo desde tu PC.
          </p>
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-[#2563EB] hover:underline"
            >
              Ver mi tienda →
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D]"
        >
          Nuevo producto
        </button>
      </div>

      {!loading ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <strong>{items.filter((p) => p.is_active).length}</strong> productos activos registrados · hasta{" "}
          <strong>{planProductCap(effectivePlan)}</strong> disponibles en plan{" "}
          <strong>{planDisplayName(effectivePlan)}</strong>
        </div>
      ) : null}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-[#111827]">
            {form.id ? "Editar producto" : "Nuevo producto"}
          </h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">Nombre</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Link del producto (opcional)
              </label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  }))
                }
                placeholder="auto si lo dejás vacío"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Precio</label>
              <input
                required
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="18900"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Precio tachado (opcional)
              </label>
              <input
                inputMode="decimal"
                value={form.compare_price}
                onChange={(e) => setForm((f) => ({ ...f, compare_price: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Stock</label>
              <input
                required
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">Descripción corta</label>
              <input
                value={form.short_desc}
                onChange={(e) => setForm((f) => ({ ...f, short_desc: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">Descripción larga</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2 space-y-4">
              <p className="text-sm font-medium text-[#374151]">
                Fotos del producto
                <span className="ml-2 font-normal text-[#6B7280]">
                  (plan {planDisplayName(effectivePlan)}: hasta {planMaxImages(effectivePlan)}{" "}
                  {planMaxImages(effectivePlan) === 1 ? "imagen" : "imágenes"})
                </span>
              </p>
              {Array.from({ length: planMaxImages(effectivePlan) }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-gray-100 bg-[#FAFAFA] p-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    Foto {idx + 1}
                    {idx === 0 ? " — principal" : ""}
                  </label>
                  <input
                    type="url"
                    value={form.image_urls[idx]}
                    onChange={(e) =>
                      setForm((f) => {
                        const next: [string, string, string] = [
                          f.image_urls[0],
                          f.image_urls[1],
                          f.image_urls[2],
                        ];
                        next[idx] = e.target.value;
                        return { ...f, image_urls: next };
                      })
                    }
                    placeholder="https://… o subí un archivo"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
                  />
                  <input
                    ref={fileRefs[idx]}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file || !token) return;
                      setUploadingSlot(idx);
                      setError(null);
                      try {
                        const { url } = await postUploadProductImage(token, file);
                        setForm((f) => {
                          const next: [string, string, string] = [
                            f.image_urls[0],
                            f.image_urls[1],
                            f.image_urls[2],
                          ];
                          next[idx] = url;
                          return { ...f, image_urls: next };
                        });
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
                      } finally {
                        setUploadingSlot(null);
                      }
                    }}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={uploadingSlot !== null}
                      onClick={() => fileRefs[idx].current?.click()}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-50"
                    >
                      {uploadingSlot === idx ? "Subiendo…" : "Subir Foto"}
                    </button>
                    {form.image_urls[idx] ? (
                      <span className="text-xs text-[#9CA3AF]">Se guarda al pulsar Guardar</span>
                    ) : null}
                  </div>
                </div>
              ))}
              <p className="text-xs text-[#9CA3AF]">
                JPG, PNG, WEBP o GIF hasta 5&nbsp;MB por archivo. También podés pegar un link público directo.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Etiquetas (separadas por coma)
              </label>
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="hogar, oferta"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div className="flex flex-wrap gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Visible en la tienda
              </label>
              <label className="flex items-center gap-2 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                />
                Destacado
              </label>
              <label className="flex items-center gap-2 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  checked={form.is_new}
                  onChange={(e) => setForm((f) => ({ ...f, is_new: e.target.checked }))}
                />
                Nuevo
              </label>
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                }}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-[#6B7280]">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[#6B7280]">Todavía no cargaste productos.</p>
            <button
              type="button"
              onClick={startNew}
              className="mt-4 text-sm font-semibold text-[#2563EB] hover:underline"
            >
              Cargá el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 w-14">Foto</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((p) => (
                  <tr key={p.id} className="text-[#374151]">
                    <td className="px-4 py-3 align-middle">
                      {p.primary_image_url ? (
                        <Image
                          src={p.primary_image_url}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="rounded-lg object-cover ring-1 ring-gray-100"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#111827]">{p.name}</p>
                      <p className="font-mono text-xs text-[#9CA3AF]">{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      ${Number(p.price).toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-3">{p.stock}</td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                          Publicado
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Baja
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="mr-2 text-sm font-medium text-[#2563EB] hover:underline"
                      >
                        Editar
                      </button>
                      {p.is_active && (
                        <button
                          type="button"
                          onClick={() => onDeactivate(p.id, p.name)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Dar de baja
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
