import { readFile, unlink, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const configuredSiteUrl = (process.env.VITE_SITE_URL || env.VITE_SITE_URL || '').trim();
const vercelProductionUrl = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
const siteUrl = (configuredSiteUrl || (vercelProductionUrl ? `https://${vercelProductionUrl}` : 'https://mv-aistudio.vercel.app')).replace(/\/$/, '');
const sitemapHint = siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : '';
const outputDirectory = 'dist/client';
// The Cloudflare Vite plugin copies local vars into its Worker output. Never ship them.
await unlink('dist/mv_studio/.dev.vars').catch(() => {});
await writeFile(`${outputDirectory}/robots.txt`, ['User-agent: *', 'Allow: /', 'Disallow: /admin', sitemapHint, ''].filter(Boolean).join('\n'));

if (siteUrl) {
  // Static-host fallback. Cloudflare Worker replaces this with its live D1-backed sitemap.
  const xmlEscape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xmlEscape(`${siteUrl}/`)}</loc></url></urlset>\n`;
  await writeFile(`${outputDirectory}/sitemap.xml`, sitemap);
  const path = `${outputDirectory}/index.html`;
  let html = await readFile(path, 'utf8');
  const business = {
    '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'MV Studio', url: `${siteUrl}/`,
    description: 'Web design and development for small businesses, startups, and growing teams in Malaysia.',
    areaServed: { '@type': 'Country', name: 'Malaysia' },
  };
  const tags = `<link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n    <meta property="og:image" content="${siteUrl}/aphome.png" />\n    <script id="mv-studio-jsonld" type="application/ld+json">${JSON.stringify(business).replace(/</g, '\\u003c')}</script>`;
  html = html.replace('content="/aphome.png"', `content="${siteUrl}/aphome.png"`).replace('</head>', `    ${tags}\n  </head>`);
  await writeFile(path, html);
}
