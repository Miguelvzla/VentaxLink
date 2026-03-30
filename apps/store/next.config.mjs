import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    // En dev, la caché persistente de Webpack + varios procesos a veces deja chunks huérfanos (ej. ./260.js).
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
