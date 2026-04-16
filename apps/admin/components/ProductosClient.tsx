"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageCropModal } from "./ImageCropModal";
import {
  type AdminCategory,
  type AdminProduct,
  type TenantMe,
  deleteJson,
  deleteCategoryApi,
  getCategories,
  getJson,
  patchJson,
  postCategory,
  postJson,
  postUploadProductImage,
  resolvePublicMediaUrl,
} from "@/lib/api";
import { getStoredTenant, getToken } from "@/lib/auth";

const storeOrigin = process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003";

type ListResponse = { data: AdminProduct[] };
type MeResponse = { data: TenantMe };

const UNIT_OPTIONS = [
  { value: "unidad", label: "Unidad (ud.)" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "gr", label: "Gramo (gr)" },
  { value: "lt", label: "Litro (lt)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "mt", label: "Metro (mt)" },
  { value: "cm", label: "Centímetro (cm)" },
  { value: "lb", label: "Libra (lb)" },
];

type FormState = {
  id: string | null;
  name: string;
  slug: string;
  short_desc: string;
  description: string;
  price: string;
  compare_price: string;
  stock: string;
  /** Posición en catálogo (1 = primero); vacío en producto nuevo = al final automático */
  sort_order: string;
  image_urls: [string, string, string];
  is_featured: boolean;
  is_new: boolean;
  tags: string;
  unit: string;
  category_id: string;
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
  sort_order: "",
  image_urls: ["", "", ""],
  is_featured: false,
  is_new: false,
  tags: "",
  unit: "unidad",
  category_id: "",
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
    sort_order: String(p.sort_order ?? 0),
    image_urls,
    is_featured: p.is_featured,
    is_new: p.is_new,
    tags: p.tags?.length ? p.tags.join(", ") : "",
    unit: p.unit ?? "unidad",
    category_id: p.category_id ?? "",
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
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  // Gestión de secciones
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  /** Archivo pendiente de recorte: { file, slot } */
  const [pendingCrop, setPendingCrop] = useState<{ file: File; slot: number } | null>(null);
  /** Guardando posición desde la tabla (fila o intercambio). */
  const [sortBusy, setSortBusy] = useState(false);
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
      const [res, me, cats] = await Promise.all([
        getJson<ListResponse>("/products", token),
        getJson<MeResponse>("/tenant/me", token),
        getCategories(token),
      ]);
      setItems(res.data);
      setPlan(me.data.plan);
      setCategories(cats.data);
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
    let sortOrderNum: number | undefined;
    if (form.sort_order.trim()) {
      const pos = Number.parseInt(form.sort_order.trim(), 10);
      if (Number.isNaN(pos) || pos < 1) {
        setError("La posición tiene que ser un número entero ≥ 1 (1 = primero en el catálogo, sin contar destacados)");
        return;
      }
      sortOrderNum = pos;
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
      if (sortOrderNum !== undefined) body.sort_order = sortOrderNum;
      body.unit = form.unit || "unidad";
      body.category_id = form.category_id || null;

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

  const canSwapWithNeighbor = useCallback((index: number, dir: "up" | "down") => {
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= items.length) return false;
    return items[index].is_featured === items[j].is_featured;
  }, [items]);

  async function applySortFromList(p: AdminProduct, raw: string) {
    if (!token) return;
    const n = Number.parseInt(String(raw).trim(), 10);
    if (Number.isNaN(n) || n < 1) {
      setError("La posición tiene que ser un número mayor o igual a 1.");
      await load();
      return;
    }
    if (n === p.sort_order) return;
    setSortBusy(true);
    setError(null);
    try {
      await patchJson<{ data: AdminProduct }>(`/products/${p.id}`, token, { sort_order: n });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la posición");
      await load();
    } finally {
      setSortBusy(false);
    }
  }

  /** Una sola petición: el servidor reubica y renumera 1…n en el grupo (sin duplicados). */
  async function swapSortWithNeighbor(index: number, dir: "up" | "down") {
    if (!token || sortBusy) return;
    if (!canSwapWithNeighbor(index, dir)) return;
    const p = items[index];
    const targetPos = dir === "up" ? index : index + 2;
    setSortBusy(true);
    setError(null);
    try {
      await patchJson<{ data: AdminProduct }>(`/products/${p.id}`, token, {
        sort_order: targetPos,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reordenar");
      await load();
    } finally {
      setSortBusy(false);
    }
  }

  async function onDesactivarProducto(id: string, name: string) {
    if (!token) return;
    if (!window.confirm(`¿Desactivar "${name}"? Dejará de mostrarse en la tienda (no se borra).`)) {
      return;
    }
    setError(null);
    try {
      await deleteJson(`/products/${id}`, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desactivar");
    }
  }

  async function onReactivarProducto(id: string, name: string) {
    if (!token) return;
    setError(null);
    try {
      await patchJson<{ data: AdminProduct }>(`/products/${id}`, token, { is_active: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reactivar");
    }
  }

  async function uploadFileToSlot(file: File, slot: number) {
    if (!token) return;
    setUploadingSlot(slot);
    setError(null);
    setPendingCrop(null);
    try {
      const { url } = await postUploadProductImage(token, file);
      setForm((f) => {
        const next: [string, string, string] = [f.image_urls[0], f.image_urls[1], f.image_urls[2]];
        next[slot] = url;
        return { ...f, image_urls: next };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function onAddCategory() {
    if (!token || !newCatName.trim()) return;
    setSavingCat(true);
    try {
      await postCategory(token, { name: newCatName.trim() });
      setNewCatName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la sección");
    } finally {
      setSavingCat(false);
    }
  }

  async function onDeleteCategory(id: string, name: string) {
    if (!token) return;
    if (!window.confirm(`¿Eliminar la sección "${name}"? Los productos quedarán sin sección asignada.`)) return;
    try {
      await deleteCategoryApi(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la sección");
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
      {pendingCrop && (
        <ImageCropModal
          file={pendingCrop.file}
          onCrop={(croppedFile) => void uploadFileToSlot(croppedFile, pendingCrop.slot)}
          onCancel={() => void uploadFileToSlot(pendingCrop.file, pendingCrop.slot)}
        />
      )}
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

      {/* ── Panel de secciones ── */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setShowCatPanel((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-semibold text-[#374151] hover:bg-gray-50 rounded-2xl"
        >
          <span>
            Secciones del catálogo
            <span className="ml-2 font-normal text-[#6B7280]">
              ({categories.length} {categories.length === 1 ? "sección" : "secciones"})
            </span>
          </span>
          <span className="text-[#9CA3AF]">{showCatPanel ? "▲" : "▼"}</span>
        </button>
        {showCatPanel && (
          <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">
            <p className="text-xs text-[#6B7280]">
              Las secciones te permiten agrupar productos (ej. &quot;Ropa&quot;, &quot;Calzado&quot;). Al agregar un producto podés asignarle una sección, y los clientes podrán filtrar por ella.
            </p>
            {categories.length === 0 && (
              <p className="text-sm text-[#9CA3AF] italic">Todavía no hay secciones. Agregá la primera abajo.</p>
            )}
            <ul className="divide-y divide-gray-100">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-[#374151]">{c.name}</span>
                    <span className="ml-2 text-xs text-[#9CA3AF]">{c.product_count} productos</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDeleteCategory(c.id, c.name)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onAddCategory(); } }}
                placeholder="Nueva sección (ej. Remeras)"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
              <button
                type="button"
                disabled={savingCat || !newCatName.trim()}
                onClick={() => void onAddCategory()}
                className="rounded-xl bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
              >
                {savingCat ? "…" : "Agregar"}
              </button>
            </div>
          </div>
        )}
      </div>

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
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Posición en el catálogo
              </label>
              <input
                inputMode="numeric"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sort_order: e.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder={form.id ? undefined : "Auto (al final)"}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
              <p className="mt-1 text-xs text-[#6B7280]">
                1 = aparece primero dentro de su grupo (los destacados van antes que el resto). Si elegís una
                posición ya usada, los demás se reordenan solos (2, 3, 4…).
                {form.id ? "" : " Si lo dejás vacío al crear, se asigna solo al final."}
              </p>
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
                    type="text"
                    inputMode="url"
                    autoComplete="off"
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
                    placeholder="Pegá un link https://… o subí una imagen abajo"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
                  />
                  <input
                    ref={fileRefs[idx]}
                    type="file"
                    accept="image/*"
                    aria-label={`Elegir imagen para la foto ${idx + 1}`}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file || !token) return;
                      setPendingCrop({ file, slot: idx });
                    }}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={uploadingSlot !== null}
                      onClick={() => fileRefs[idx].current?.click()}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-50"
                    >
                      {uploadingSlot === idx ? "Subiendo…" : "Subir desde galería o archivos"}
                    </button>
                    {form.image_urls[idx] ? (
                      <span className="text-xs text-[#9CA3AF]">Pulsá Guardar abajo para persistir el producto y la foto</span>
                    ) : null}
                  </div>
                </div>
              ))}
              <p className="text-xs text-[#6B7280]">
                Podés usar un <strong>link público</strong> (https) o <strong>subir un archivo</strong>; la ruta interna (/v1/uploads/…) es válida. JPG, PNG, WEBP o GIF hasta 5&nbsp;MB. En el servidor de producción, un{" "}
                <strong>volumen persistente</strong> y la variable <code className="rounded bg-gray-100 px-1">UPLOADS_DIR</code> en la API evitan que se pierdan las fotos al redesplegar.
              </p>
            </div>
            {/* Unidad de medida */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Unidad de medida</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2 bg-white"
              >
                {UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Sección */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Sección</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#22C55E] focus:ring-2 bg-white"
              >
                <option value="">Sin sección</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  Creá secciones desde el panel &quot;Secciones del catálogo&quot; de arriba.
                </p>
              )}
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
            <p className="border-b border-gray-100 bg-[#FAFAFA] px-4 py-2.5 text-xs text-[#6B7280]">
              <strong className="text-[#374151]">Orden en la tienda:</strong> primero los{" "}
              <span className="font-medium text-[#111827]">destacados</span>, luego el resto. Dentro de cada
              grupo, el número más chico queda más arriba. Si ponés un producto en una posición que ya ocupaba
              otro, el resto se corre automáticamente (2, 3, 4…). Podés usar flechas o el número sin abrir
              Editar.
            </p>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 w-14">Foto</th>
                  <th className="px-2 py-3 w-[7.5rem] text-center">Posición</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((p, rowIndex) => (
                  <tr key={p.id} className="text-[#374151]">
                    <td className="px-4 py-3 align-middle">
                      {p.primary_image_url ? (
                        <Image
                          src={resolvePublicMediaUrl(p.primary_image_url)}
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
                    <td className="px-2 py-3 align-middle">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            disabled={sortBusy || !canSwapWithNeighbor(rowIndex, "up")}
                            onClick={() => swapSortWithNeighbor(rowIndex, "up")}
                            className="rounded-md p-1 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Subir una posición"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={sortBusy || !canSwapWithNeighbor(rowIndex, "down")}
                            onClick={() => swapSortWithNeighbor(rowIndex, "down")}
                            className="rounded-md p-1 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Bajar una posición"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                        <input
                          type="number"
                          min={1}
                          disabled={sortBusy}
                          defaultValue={p.sort_order}
                          key={`${p.id}-${p.sort_order}-${p.updated_at}`}
                          onBlur={(e) => void applySortFromList(p, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-full max-w-[4.25rem] rounded-lg border border-gray-200 px-1 py-1 text-center text-sm tabular-nums text-[#374151] outline-none ring-[#22C55E] focus:ring-2 disabled:opacity-50"
                          title="Posición (menor = más arriba en su grupo)"
                          aria-label={`Posición de ${p.name}`}
                        />
                      </div>
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
                      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-sm font-medium text-[#2563EB] hover:underline"
                        >
                          Editar
                        </button>
                        {p.is_active ? (
                          <button
                            type="button"
                            onClick={() => onDesactivarProducto(p.id, p.name)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onReactivarProducto(p.id, p.name)}
                            className="text-sm font-medium text-emerald-700 hover:underline"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
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
