import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL(
    "/sitemap-index.xml",
    site ?? "http://localhost:4321",
  ).toString();

  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${sitemapUrl}\n`,
    {
      headers: {
        "Content-Type": "text/plain",
      },
    },
  );
};
