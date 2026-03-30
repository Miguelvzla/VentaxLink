const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../../..");
const schema = path.join(root, "packages", "database", "prisma", "schema.prisma");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");

const MAX_ATTEMPTS = 5;
const RETRY_MS = 2500;

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* espera activa breve; solo entre reintentos */
  }
}

function runGenerate() {
  return spawnSync(process.execPath, [prismaCli, "generate", "--schema", schema], {
    cwd: root,
    encoding: "utf8",
    stdio: ["inherit", "inherit", "pipe"],
  });
}

let lastStderr = "";

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const result = runGenerate();
  lastStderr = result.stderr || "";
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status === 0) {
    process.exit(0);
  }

  const isEperm =
    /EPERM|operation not permitted|EBUSY|access is denied/i.test(lastStderr) ||
    /EPERM|operation not permitted/i.test(result.error?.message || "");

  if (isEperm && attempt < MAX_ATTEMPTS) {
    console.error(
      `\n[prisma-generate] Intento ${attempt}/${MAX_ATTEMPTS}: archivo del motor bloqueado (típico en Windows). ` +
        `Esperando ${RETRY_MS}ms y reintentando…\n` +
        `  → Cerrá \`npm run dev\`, la API Nest y Prisma Studio en este repo antes de generar.\n`,
    );
    sleepSync(RETRY_MS);
    continue;
  }

  break;
}

console.error(`
----------------------------------------------------------------------
Prisma generate falló (EPERM en Windows = archivo del motor bloqueado).
Pasos que suelen resolverlo:
  1) Parar \`npm run dev\`, API Nest y Prisma Studio (Ctrl+C en cada terminal).
  2) Cerrar Cursor/VS Code un momento (el servidor de TypeScript a veces mantiene cargado el cliente Prisma).
  3) Administrador de tareas → finalizar procesos "Node.js" que sigan activos.
  4) Abrir PowerShell o CMD nuevo, \`cd\` al repo y: npm run db:generate
  5) Antivirus / Defender: excluir la carpeta del repo o reintentar cuando termine un análisis.
----------------------------------------------------------------------
`);

process.exit(1);
