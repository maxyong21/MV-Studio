import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const configuredUrl = (process.env.VITE_SITE_URL || env.VITE_SITE_URL)?.trim().replace(/\/$/, '');
const detailPages = ['APMoodle.html', 'hypertextedu.html', 'PsychologyConsultationManagementSystem.html', 'SuperMathsBros.html'];

const robots = ['User-agent: *', 'Allow: /', 'Disallow: /admin', ...(configuredUrl ? [`Sitemap: ${configuredUrl}/sitemap.xml`] : []), ''].join('\n');
await writeFile('dist/robots.txt', robots);

if (!configuredUrl) {
  console.log('robots.txt generated. Set VITE_SITE_URL before building to also generate sitemap.xml.');
} else {
  let projects = [];
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const publicKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && publicKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/projects?select=id,name,summary,seo_title,seo_description,image_url&active=eq.true`, {
        headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` },
      });
      if (response.ok) projects = await response.json();
      else console.warn(`Could not fetch project URLs for sitemap: ${response.status}`);
    } catch (error) {
      console.warn(`Could not fetch project URLs for sitemap: ${error.message}`);
    }
  }

  const projectRoutes = projects.map(project => `${configuredUrl}/projects/${encodeURIComponent(project.id)}`);
  const locations = [configuredUrl, ...projectRoutes, ...detailPages.map(page => `${configuredUrl}/${page}`)];
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...locations.map(url => `  <url><loc>${url}</loc></url>`), '</urlset>', ''].join('\n');
  await writeFile('dist/sitemap.xml', xml);

  const indexPath = 'dist/index.html';
  const html = await readFile(indexPath, 'utf8');
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'MV Studio',
    url: `${configuredUrl}/`,
    description: 'Web design and development for small businesses, startups, and growing teams in Malaysia.',
    areaServed: { '@type': 'Country', name: 'Malaysia' },
  };
  const jsonLd = `<script id="mv-studio-jsonld" type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
  const canonical = `<link rel="canonical" href="${configuredUrl}/" />`;
  const socialTags = `<meta property="og:url" content="${configuredUrl}/" />\n    <meta property="og:image" content="${configuredUrl}/aphome.png" />`;
  const enriched = html
    .replace('content="/aphome.png"', `content="${configuredUrl}/aphome.png"`)
    .replace('</head>', `    ${canonical}\n    ${socialTags}\n    ${jsonLd}\n  </head>`);
  await writeFile(indexPath, enriched);

  const htmlEscape = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const replaceMeta = (source, key, value, attribute = 'property') => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`<meta\\s+${attribute}=["']${escapedKey}["'][^>]*>`, 'i');
    const tag = `<meta ${attribute}="${htmlEscape(key)}" content="${htmlEscape(value)}" />`;
    return pattern.test(source) ? source.replace(pattern, tag) : source.replace('</head>', `    ${tag}\n  </head>`);
  };

  for (const project of projects) {
    // IDs are UUIDs in the database; restrict the output path to that format.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project.id)) continue;
    const url = `${configuredUrl}/projects/${project.id}`;
    const title = project.seo_title || `${project.name} | MV Studio Projects`;
    const description = project.seo_description || project.summary || `Explore the ${project.name} project by MV Studio.`;
    const image = project.image_url ? new URL(project.image_url, `${configuredUrl}/`).href : `${configuredUrl}/aphome.png`;
    const projectGraph = { '@context': 'https://schema.org', '@type': 'CreativeWork', name: project.name, headline: title, description, url, image, creator: { '@type': 'Organization', name: 'MV Studio', url: `${configuredUrl}/` } };
    let page = enriched.replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(title)}</title>`);
    page = replaceMeta(page, 'description', description, 'name');
    page = replaceMeta(page, 'og:title', title);
    page = replaceMeta(page, 'og:description', description);
    page = replaceMeta(page, 'og:url', url);
    page = replaceMeta(page, 'og:image', image);
    page = replaceMeta(page, 'twitter:title', title, 'name');
    page = replaceMeta(page, 'twitter:description', description, 'name');
    page = page.replace(/<link rel="canonical" href="[^"]*"\s*\/>/i, `<link rel="canonical" href="${url}" />`);
    page = page.replace(/<script id="mv-studio-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script id="mv-studio-jsonld" type="application/ld+json">${JSON.stringify(projectGraph).replace(/</g, '\\u003c')}</script>`);
    const outputDirectory = `dist/projects/${project.id}`;
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(`${outputDirectory}/index.html`, page);
  }
  console.log(`SEO files generated for ${configuredUrl}${projects.length ? ` (${projects.length} project pages)` : ''}`);
}
