import { readFile, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const configuredUrl = (process.env.VITE_SITE_URL || env.VITE_SITE_URL)?.trim().replace(/\/$/, '');
const detailPages = [
  'APMoodle.html',
  'hypertextedu.html',
  'PsychologyConsultationManagementSystem.html',
  'SuperMathsBros.html',
];

const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  ...(configuredUrl ? [`Sitemap: ${configuredUrl}/sitemap.xml`] : []),
  '',
].join('\n');
await writeFile('dist/robots.txt', robots);

if (configuredUrl) {
  const projectRoutes = [];
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const publicKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && publicKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/projects?select=id&active=eq.true`, {
        headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` },
      });
      if (response.ok) {
        const projects = await response.json();
        projectRoutes.push(...projects.map(project => `${configuredUrl}/projects/${encodeURIComponent(project.id)}`));
      } else {
        console.warn(`Could not fetch project URLs for sitemap: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Could not fetch project URLs for sitemap: ${error.message}`);
    }
  }
  const locations = [configuredUrl, ...projectRoutes, ...detailPages.map(page => `${configuredUrl}/${page}`)];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map(url => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  await writeFile('dist/sitemap.xml', xml);
  const indexPath = 'dist/index.html';
  const html = await readFile(indexPath, 'utf8');
  const canonical = `<link rel="canonical" href="${configuredUrl}/" />`;
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'MV Studio',
    url: `${configuredUrl}/`,
    description: 'Web design and development for small businesses in Malaysia.',
    areaServed: { '@type': 'Country', name: 'Malaysia' },
    priceRange: 'RM 449–RM 1,709+',
  };
  const jsonLd = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
  const socialTags = `<meta property="og:url" content="${configuredUrl}/" />\n    <meta property="og:image" content="${configuredUrl}/aphome.png" />`;
  const enriched = html
    .replace('content="/aphome.png"', `content="${configuredUrl}/aphome.png"`)
    .replace('</head>', `    ${canonical}\n    ${socialTags}\n    ${jsonLd}\n  </head>`);
  await writeFile(indexPath, enriched);
  console.log(`SEO files generated for ${configuredUrl}`);
} else {
  console.log('robots.txt generated. Set VITE_SITE_URL before building to also generate sitemap.xml.');
}
