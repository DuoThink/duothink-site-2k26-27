import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import site from '../../site.json' with { type: 'json' };
import { renderPortfolio } from '../portfolio.mjs';

const documents = join(process.cwd(), 'pages-original');
const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' };

export async function GET(request, { params }) {
  const { route = [] } = await params;
  const path = '/' + route.join('/');
  const legacyPage = path.replace(/\/index\.html$/u, '') || '/';
  let redirect = Object.hasOwn(site.redirects, path) ? site.redirects[path] : null;
  if (!redirect && legacyPage !== path && Object.hasOwn(site.pages, legacyPage)) redirect = legacyPage;

  if (redirect) {
    const { search } = new URL(request.url);
    return new Response(null, {
      status: 308,
      headers: { Location: redirect + search },
    });
  }

  const studio = Object.hasOwn(site.studios, route[0]) ? site.studios[route[0]] : null;
  const page = Object.hasOwn(site.pages, path) ? site.pages[path] : null;
  const notFound = studio?.notFound ?? site.notFound;
  const status = page && path !== `/${route[0]}/404` ? 200 : 404;
  const html = renderPortfolio(await readFile(join(documents, page ?? notFound), 'utf8'), path);
  return new Response(html, { headers, status });
}
