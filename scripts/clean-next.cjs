/**
 * Borra .next (y .turbo por app) para evitar chunks huérfanos tipo ./522.js en Next dev.
 * Si falla "Acceso denegado", cerrá npm run dev y volvé a ejecutar.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apps = ["web", "admin", "store"];

for (const app of apps) {
  for (const name of [".next", ".turbo"]) {
    const dir = path.join(root, "apps", app, name);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log("removed", dir);
    } catch (e) {
      console.warn("skip", dir, "→", e.message);
    }
  }
}

const nodeCache = path.join(root, "node_modules", ".cache");
try {
  fs.rmSync(nodeCache, { recursive: true, force: true });
  console.log("removed", nodeCache);
} catch (e) {
  console.warn("skip", nodeCache, "→", e.message);
}

console.log("Listo. Reiniciá el dev server (npm run dev o solo la app web).");
