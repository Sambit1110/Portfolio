import "server-only";

// Public address of the site, for canonical links, social previews, robots and
// the sitemap. Set SITE_URL (e.g. https://your-domain.com) once the domain is
// known; until then Vercel's production URL is used, and localhost elsewhere.
// Read at build time. Not a secret.
function resolveSiteUrl() {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL(`http://localhost:${process.env.PORT || 3000}`);
}

export const SITE_URL = resolveSiteUrl();
