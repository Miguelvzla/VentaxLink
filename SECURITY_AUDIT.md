# Reporte de Seguridad — VentaXLink

**Diagnóstico inicial:** 2026-05-04
**Cierre del sprint de remediación:** 2026-05-05
**Alcance:** monorepo completo (`apps/api`, `apps/admin`, `apps/store`, `apps/web`, `packages/*`).
**Método:** revisión manual de código + `npm audit` + inspección de `.env`, DTOs, guards, controllers, servicios y schema Prisma.

---

## TL;DR — Estado final

- **10 hallazgos cerrados** con commits en `main`.
- **2 hallazgos diferidos** con justificación (no aplicables hoy / pendiente de Next 16).
- **3 mejoras a futuro** registradas como deuda técnica para cuando cambien condiciones (invitar empleados, integrar pagos, hardenizar sesiones).
- `npm audit` pasó de **7 vulnerabilidades** (3 high, 4 moderate) a **2 vulnerabilidades transitivas** (postcss bundleado dentro de Next, no fixable hoy).

---

## 1) Hallazgos cerrados

| # | Riesgo | Sev. inicial | Commit / archivo | Resumen del fix |
|---|---|---|---|---|
| 4 | JWT_SECRET con fallback hardcodeado | Alta | `63450e3` — `apps/api/src/auth/auth.module.ts` | Bootstrap exige `JWT_SECRET ≥32` chars desde env, sin valor por defecto. |
| 6 | CORS abre `*.railway.app` | Alta | `d052bf3` — `apps/api/src/main.ts` | Allowlist exacta de `ventaxlink(api\|admin\|store\|web)-production.up.railway.app` además de `*.ventaxlink.ar`. |
| 7 | Faltan headers de seguridad (Helmet) | Alta | `5225675` — `apps/api/src/main.ts` | `helmet()` aplicado con CSP off (para no romper Next.js) y `cross-origin-resource-policy: cross-origin` para servir uploads. |
| 15 | Sin rate limit en `/auth/reset-password` | Media | `7c6d08a` — `apps/api/src/main.ts` + `.env.example` | Limiter dedicado: 10 req/min por IP, configurable con `RATE_LIMIT_RESET_PASSWORD_*`. |
| 10 | DTO inline en `patchMarketplaceTerms` | Media | `1668c73` — `apps/api/src/platform/...` | Reemplazado por clase `PatchMarketplaceTermsDto` con `@IsString @MinLength(40) @MaxLength(20000)`. |
| 11 | Logging de PII (emails de clientes) | Media | `ded478e` — `common/redact.ts`, `notifications/*`, `store.service.ts`, `auth.service.ts`, `platform-tenants.service.ts` | Helper `redactEmail()` centralizado. Todos los `logger.log/warn` que imprimían emails completos pasan por él (ej. `ju…@gmail.com`). |
| 12 | MIME spoofing en uploads | Media | `ed7a110` — `common/image-magic.ts`, `uploads/uploads.controller.ts` | Validación de magic bytes (JPEG/PNG/WEBP/GIF) tras escribir el archivo. Si no coincide se borra del disco y se responde 400. |
| 8 | Dependencias con CVE | Alta | Múltiples commits (ver abajo) | Sprint completo de bumps. Detalle: |
| | • `xlsx` (high × 2, sin fix) | | `24bd4a2`, `8c81a0b`, `6cc9182` | Reemplazado por `write-excel-file@4` en el admin. Actualizado a su API v4 (`toFile()`). |
| | • `next` 15.5.14 → 15.5.15 (high) | | `e8544fa` | Patch en root + admin/store/web + matching `eslint-config-next`. |
| | • `nodemailer` ^8.0.3 → ^8.0.7 (moderate) | | `54eb63b` | Patch dentro de 8.x. |
| | • `@nestjs/core/common/platform-express` 11.1.17 → 11.1.19 (moderate) | | `7089f51` | Patch dentro de 11.1.x. |
| | • `defu` 6.1.4 → 6.1.7 (high, transitivo) | | `d35812f` | Lockfile-only, vía Prisma → c12 → defu. |
| 3 | Rotar credenciales | Crítica | Acción manual | Gmail App Password rotada (la vieja `wdaffgohfvaxyyib` borrada). `JWT_SECRET` de Railway verificado distinto al placeholder, no requirió rotación. |
| 9 | Secretos del Tenant en BD sin cifrar | Alta | `5834d71` — `common/crypto.ts`, `tenant.service.ts`, `notifications/order-notifications.service.ts` | AES-256-GCM con `ENCRYPTION_KEY` en Railway. Cifrado al escribir `smtp_pass` y `notify_callmebot_apikey`; descifrado al leer en `createTransporter` y `sendCallMeBotIfConfigured`. Prefijo `enc:v1:` permite backward-compat con texto plano legacy. |

---

## 2) Hallazgos diferidos (con justificación)

| # | Hallazgo | Por qué se difiere | Cuándo retomar |
|---|---|---|---|
| 1 | Auto-cambio de plan sin pago | Es **intencional** — el comentario en el DTO lo indica: "upgrade/downgrade manual hasta integrar cobro recurrente". El comercio queda registrado y el cobro se coordina por fuera. | Cuando se integre Mercado Pago/Naranja: quitar `plan` del DTO y que solo lo cambie el webhook de pago. |
| 2 | Sin `RolesGuard` (OWNER/ADMIN/CASHIER/VIEWER) | Hoy **cada tenant tiene exactamente 1 usuario (OWNER)** y no existe feature de invitación de empleados. La separación cross-tenant (que sí importa) está bien hecha. | **Antes** de mergear el feature de "invitar empleados". Sin guard, cualquier cajero invitado podría borrar todo. |

---

## 3) Mejoras recomendadas para el futuro

| Trigger | Acción |
|---|---|
| Integrar Mercado Pago / Naranja | Webhook con verificación de firma HMAC + IP allowlist + `idempotency-key`. Recalcular `total` desde la BD (nunca confiar en el body). Cifrar `mp_access_token` / `naranja_token` reutilizando `crypto.ts` (los wrappers de write/read ya están listos). |
| Invitar empleados | Implementar `RolesGuard` + decorator `@Roles(...)`. Aplicar a controllers de products/orders/customers/tenant/coupons/categories/uploads. |
| Sospecha de token comprometido | Bajar `JWT_EXPIRES_IN` a 15-30m, implementar refresh tokens rotativos (ya hay `User.refresh_token` en schema) y `token_version` para invalidar sesiones tras reset de contraseña. |
| Auditorías regulares | Correr `npm audit --omit=dev` cada 2-4 semanas. Si Next libera 15.5.16+ con postcss 8.5.10+ bundleado, bumpear para cerrar las 2 vulns transitivas restantes. |
| Datos personales (Ley 25.326 / GDPR) | Considerar borrado real de `Customer` tras X meses de inactividad o por solicitud del titular. Hoy hay soft-delete de tenants pero customers quedan. |

---

## 4) Lo que ya estaba bien (no se tocó)

- Passwords con `bcrypt.hash(..., 10)`.
- Tokens de reset hasheados con SHA-256 antes de guardar.
- `forgot-password` no revela si el email existe.
- `ValidationPipe` global con `whitelist + forbidNonWhitelisted + transform`.
- `$queryRaw` con tagged templates parametrizados (sin concatenación).
- Multi-tenant: todas las queries filtran por `tenant_id`.
- Body limit 256kb, request timeout 15s.
- Rate-limit por IP en login, register, forgot-password, checkout, track, contact, mail-test.
- Static serving de uploads con `path.resolve` + check `..` (no path traversal).
- `.env` correctamente gitignored, **nunca** estuvo trackeado en git.
- Checkout recalcula totales server-side (no confía en el cliente).
- Stack traces no se devuelven al cliente, solo se loguean.

---

## 5) Lista de commits del sprint

```
63450e3 fix(api): require JWT_SECRET from env (no hardcoded fallback)
d052bf3 fix(api): restrict Railway CORS to own subdomains only
5225675 fix(api): add helmet for HTTP security headers
7c6d08a fix(api): add dedicated rate limiter for reset-password
1668c73 fix(api): use real DTO for patchMarketplaceTerms
ded478e fix(api): redact emails in logs (PII)
ed7a110 fix(api): verify uploaded image magic bytes (no MIME spoofing)
24bd4a2 fix(admin): replace xlsx with write-excel-file
8c81a0b fix(admin): import write-excel-file from /browser subpath
6cc9182 fix(admin): adapt to write-excel-file v4 API (toFile)
e8544fa chore(deps): bump next 15.5.14 -> 15.5.15
54eb63b chore(deps): bump nodemailer ^8.0.3 -> ^8.0.7
7089f51 chore(deps): bump @nestjs/* 11.1.17 -> 11.1.19
d35812f chore(deps): bump transitive defu 6.1.4 -> 6.1.7
5834d71 fix(api): encrypt tenant secrets at rest (AES-256-GCM)
```

---

## 6) Variables nuevas en Railway

Estas envs fueron agregadas durante el sprint y deben mantenerse:

| Variable | Para qué |
|---|---|
| `ENCRYPTION_KEY` | Clave AES-256 (32 bytes hex) para cifrar `smtp_pass`, `notify_callmebot_apikey`, etc. **No rotar sin migrar datos.** |
| `RATE_LIMIT_RESET_PASSWORD_WINDOW_MS` (opcional) | Default 60000 |
| `RATE_LIMIT_RESET_PASSWORD_MAX` (opcional) | Default 10 |

`SMTP_PASS` rotada manualmente (la app password vieja de Gmail fue eliminada).

---

## 7) Cómo seguir manteniendo seguridad

- Antes de cualquier release: `npm audit --omit=dev` y revisar nuevas vulns.
- Mantener `.env` fuera del repo siempre (`.gitignore` ya lo cubre).
- Cualquier secret nuevo en BD: pasarlo por `encryptSecret()` antes de guardar.
- Cualquier endpoint nuevo: `@UseGuards(JwtAuthGuard)` y, en cuanto exista `RolesGuard`, también `@Roles(...)`.
- Si Next libera un patch con postcss actualizado, bumpear para cerrar las 2 vulns que quedan.
