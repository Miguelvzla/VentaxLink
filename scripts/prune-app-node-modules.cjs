// Tras npm install, npm puede volver a crear carpetas node_modules dentro de apps (web, admin, store)
// y eso rompe Next (ENOWORKSPACES). Borra esas carpetas; las dependencias quedan en la raíz del monorepo.
const path = require("path");
const { rmTreeSync } = require("./rm-tree.cjs");

const root = path.join(__dirname, "..");
for (const app of ["web", "admin", "store"]) {
  const dir = path.join(root, "apps", app, "node_modules");
  try {
    rmTreeSync(dir);
    console.log("[prune-app-node-modules] removed", dir);
  } catch (e) {
    console.warn("[prune-app-node-modules]", dir, e.message);
    console.warn(
      "[prune-app-node-modules] Si persiste: cierra el IDE en el repo y ejecuta npm run reinstall"
    );
  }
}
