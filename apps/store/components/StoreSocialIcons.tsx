import type { PublicTenant } from "@/lib/api";

type Props = {
  tenant: PublicTenant;
  waHref: string | null;
  /** compact = header, relaxed = footer */
  variant?: "header" | "footer";
  /** Botones más chicos (barra del header con muchos íconos) */
  compact?: boolean;
};

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function StoreSocialIcons({ tenant, waHref, variant = "header", compact = false }: Props) {
  const ig = tenant.instagram_url?.trim();
  const fb = tenant.facebook_url?.trim();
  const tt = tenant.tiktok_url?.trim();

  const btnHeader = compact
    ? "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/80 bg-white/95 text-[#374151] shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
    : "flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/90 text-[#374151] shadow-md ring-1 ring-black/5 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:shadow-lg hover:ring-2 active:scale-95";

  const btn =
    variant === "header"
      ? btnHeader
      : "flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-[#374151] shadow-sm transition-all duration-200 hover:scale-110 hover:border-gray-300 hover:shadow-md active:scale-95";

  const glyph =
    variant === "header" ? (compact ? "h-4 w-4" : "h-5 w-5") : "h-6 w-6";

  const hasAny = !!(ig || fb || tt || waHref);
  if (!hasAny) return null;

  const listWrap = variant === "footer" || !compact ? "flex-wrap" : "flex-nowrap";

  return (
    <ul className={`flex items-center ${listWrap} ${compact ? "gap-2" : "gap-3 sm:gap-4"}`}>
      {ig ? (
        <li>
          <a
            href={ig}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} hover:text-pink-600`}
            aria-label="Instagram"
          >
            <InstagramGlyph className={glyph} />
          </a>
        </li>
      ) : null}
      {fb ? (
        <li>
          <a
            href={fb}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} hover:text-[#1877F2]`}
            aria-label="Facebook"
          >
            <FacebookGlyph className={glyph} />
          </a>
        </li>
      ) : null}
      {tt ? (
        <li>
          <a
            href={tt}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} hover:text-[#000]`}
            aria-label="TikTok"
          >
            <TikTokGlyph className={glyph} />
          </a>
        </li>
      ) : null}
      {waHref ? (
        <li>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} text-[#25D366] hover:text-[#128C7E]`}
            aria-label="WhatsApp"
          >
            <WhatsAppGlyph className={glyph} />
          </a>
        </li>
      ) : null}
    </ul>
  );
}
