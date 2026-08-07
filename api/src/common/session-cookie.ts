import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'idsid';

const isProd = process.env.NODE_ENV === 'production';

/**
 * sameSite: 'none' en producción porque el frontend (Vercel) y la API (Railway) viven en
 * dominios distintos — una petición fetch entre sitios distintos no manda cookies 'lax'.
 * 'none' exige secure:true, que ya aplica en producción (HTTPS en ambos lados).
 */
export function sessionCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}
