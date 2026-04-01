import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  eslint: {
    ignoreDuringBuilds: true,
  },
  /** Fotos de productos vienen de la API (otro dominio); sin esto Next/Image falla en prod. */
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    // En Windows + Turbo, la caché persistente de Webpack a veces deja chunks huérfanos (vendor-chunks/next.js, *.pack.gz).
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
