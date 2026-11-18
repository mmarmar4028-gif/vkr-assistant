import type { NextConfig } from "next";

/**
 * Приложение целиком работает в браузере пользователя (данные читаются из
 * Supabase после входа), поэтому серверные возможности кеширования
 * (cacheComponents, partialPrefetching) здесь не нужны и отключены.
 */
const nextConfig: NextConfig = {
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
