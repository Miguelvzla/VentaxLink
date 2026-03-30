const fs = require("fs");

/** Borrado recursivo tolerante a bloqueos breves (antivirus, indexación, IDE) en Windows. */
function rmTreeSync(dir) {
  fs.rmSync(dir, {
    recursive: true,
    force: true,
    maxRetries: 12,
    retryDelay: 150,
  });
}

module.exports = { rmTreeSync };
