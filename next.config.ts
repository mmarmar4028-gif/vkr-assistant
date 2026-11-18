import type { NextConfig } from "next";

/**
 * Сайт собирается как набор статических файлов (папка out/), которые можно
 * разместить где угодно — например, на GitHub Pages. Сервер не нужен: всё
 * работает в браузере.
 *
 * NEXT_PUBLIC_BASE_PATH — путь сайта на GitHub Pages («/vkr-assistant»).
 * Его задаёт команда npm run build:pages; при локальном запуске он пустой.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
