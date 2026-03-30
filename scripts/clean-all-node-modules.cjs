// Borra node_modules en la raíz y en apps/* (útil cuando npm dejó el árbol corrupto en Windows).
const path = require("path");
const { rmTreeSync } = require("./rm-tree.cjs");

const root = path.join(__dirname, "..");
const targets = [
  path.join(root, "node_modules"),
  ...["web", "admin", "store"].map((a) => path.join(root, "apps", a, "node_modules")),
];

for (const dir of targets) {
  try {
    rmTreeSync(dir);
    console.log("[clean-all-node-modules] removed", dir);
  } catch (e) {
    console.warn("[clean-all-node-modules]", dir, e.message);
  }
}
