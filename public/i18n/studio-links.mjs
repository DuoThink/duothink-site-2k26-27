import { studios } from './studio-routes.mjs';

export function studioTarget(slug, reference, origin) {
  const studio = studios[slug];
  if (!studio || !reference || reference.startsWith('#') || reference.startsWith('?')) return null;
  let url;
  try { url = new URL(reference, studio.original); } catch { return null; }
  if (![new URL(studio.original).origin, origin].includes(url.origin)) return null;
  let path = url.pathname.replace(/\/+$/u, '') || '/';
  if (path === `/${slug}`) path = '/';
  else if (path.startsWith(`/${slug}/`)) path = path.slice(slug.length + 1);
  if (!studio.pages.includes(path)) return null;
  return `/${slug}${path === '/' ? '' : path}${url.search}${url.hash}`;
}

export function normalizeStudioLinks(slug) {
  if (!studios[slug]) return;
  for (const anchor of document.querySelectorAll('a[href]')) {
    const reference = anchor.getAttribute('href');
    const target = studioTarget(slug, reference, location.origin);
    if (target && reference !== target) anchor.setAttribute('href', target);
  }
}
