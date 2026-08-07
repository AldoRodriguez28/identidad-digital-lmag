import type { NextConfig } from "next";

// Proxy /api/* al backend real (API_ORIGIN, server-side only). Así el navegador solo ve
// un origen (el de Vercel) y la cookie de sesión deja de ser "cross-site" — evita que
// Safari/Firefox en modo estricto la bloqueen aunque tenga SameSite=None; Secure.
const API_ORIGIN = process.env.API_ORIGIN;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!API_ORIGIN) return [];
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
