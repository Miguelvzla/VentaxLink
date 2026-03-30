/**
 * Evita que NODE_PATH apunte a carpetas globales (p. ej. C:\Users\...\node_modules),
 * lo que duplica @types/react y rompe el chequeo de tipos con lucide-react / Next.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const nextBin = path.join(repoRoot, "node_modules/next/dist/bin/next");
const args = process.argv.slice(2);

const env = { ...process.env };
delete env.NODE_PATH;

const r = spawnSync(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  cwd: process.cwd(),
  env,
  windowsHide: true,
});

process.exit(r.status ?? 1);
