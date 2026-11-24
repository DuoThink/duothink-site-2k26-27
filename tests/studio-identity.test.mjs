import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import site from '../site.json' with { type: 'json' };
import { studioInstagram, studioTelephone, studioLink, guardStudioIdentityClick } from '../public/i18n/studio-identity.mjs';

const root = new URL('../', import.meta.url).pathname;
const studios = Object.keys(site.studios);
const socialHost = /(?:https?:)?\/\/(?:[^/]+\.)?(?:instagram\.com|instragram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|behance\.net|dribbble\.com|pinterest\.com|threads\.net|tiktok\.com|wa\.me)(?:\/|$)/iu;
const visible = html => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, '').replace(/<!--[^]*?-->/gu, '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ');

test('studio social links are empty except for the DuoThink Instagram', async () => {
  let instagramLinks = 0;
  let disabledLinks = 0;
  for (const [route, file] of Object.entries(site.pages)) {
    if (!studios.some(slug => route === `/${slug}` || route.startsWith(`/${slug}/`))) continue;
    const html = await readFile(join(root, 'pages-original', file), 'utf8');
    for (const [anchor] of html.matchAll(/<a\b[^>]*>/giu)) {
      const href = anchor.match(/\bhref="([^"]*)"/u)?.[1];
      const network = anchor.match(/\bdata-duo-social="([^"]*)"/u)?.[1];
      if (network === 'instagram' || socialHost.test(href || '')) {
        assert.equal(href, studioInstagram, route);
        instagramLinks += 1;
      } else if (network) {
        assert.equal(href, '', route);
        assert.match(anchor, /aria-disabled="true"/u, route);
        disabledLinks += 1;
      }
    }
  }
  assert.ok(instagramLinks > 100);
  assert.ok(disabledLinks > 100);
});

test('contact numbers and telephone targets use the requested zero placeholder', async () => {
  let numbers = 0;
  for (const slug of studios) {
    const directory = join(root, 'pages-original', slug);
    for (const file of await readdir(directory, { recursive: true })) {
      if (!file.endsWith('.html')) continue;
      const html = await readFile(join(directory, file), 'utf8');
      for (const [, href] of html.matchAll(/href="(tel:[^"]*)"/giu)) {
        assert.equal(href, studioTelephone, `${slug}/${file}`);
        numbers += 1;
      }
      assert.doesNotMatch(visible(html), /(?:\+62 812 3456 7890|\+1 \(123\) 456-7890|\(217\) 555-0113|\(49\) 98813-0298|205-384-5055)/u);
    }
  }
  assert.ok(numbers > 100);
});

test('existing agency and author credits identify DuoThink', async () => {
  for (const slug of ['zeta', 'bruno-brandini', 'calibre', 'cavora', 'forma', 'grid', 'housemood', 'korda', 'totnt']) {
    const html = await readFile(join(root, 'pages-original', slug, 'index.html'), 'utf8');
    const text = visible(html);
    assert.match(text, /Desenvolvido por DuoThink/u, slug);
    assert.doesNotMatch(text, /TNCFlow|Doss Propaganda|Timofey Bak|Tim Bak|Hariom|(?:por Flux)|Design Monk|Quatro e doze/u, slug);
  }
});

test('social settings preserve embedded video sources', () => {
  const video = 'https://www.youtube.com/watch?v=e3oRZppwoE4';
  assert.equal(studioLink(video, { preserveServices: true }), video);
  assert.equal(studioLink('https://www.youtube.com/@totntdesenvolvedora'), '');
  assert.equal(studioLink('http://instragram.com/'), studioInstagram);
});

test('the property catalog retains playable videos', async () => {
  const directory = join(root, 'public/sites/totnt/data');
  const catalogs = await Promise.all((await readdir(directory)).filter(f => f.endsWith('-pt-BR.framercms')).map(f => readFile(join(directory, f))));
  assert.ok(catalogs.some(file => file.includes(Buffer.from('https://www.youtube.com/watch?v=e3oRZppwoE4'))));
});

function click(attrs, text = '') {
  const result = { prevented: false, stopped: false, attrs: { ...attrs } };
  const anchor = { textContent: text, getAttribute: key => result.attrs[key] ?? null, setAttribute: (key, value) => { result.attrs[key] = value; } };
  guardStudioIdentityClick({ target: { closest: () => anchor }, preventDefault: () => { result.prevented = true; }, stopImmediatePropagation: () => { result.stopped = true; } });
  return result;
}

test('disabled social and credit links do not navigate while Instagram keeps its own destination', () => {
  assert.equal(click({ href: '', 'data-duo-social': 'facebook' }).prevented, true);
  assert.equal(click({ href: '' }, 'Desenvolvido por DuoThink').prevented, true);
  const instagram = click({ href: 'https://instagram.com/original/', 'data-duo-social': 'instagram' });
  assert.equal(instagram.attrs.href, studioInstagram);
  assert.equal(instagram.prevented, false);
  assert.equal(instagram.stopped, true);
});

test('empty links with existing gallery or menu actions retain their original click handling', () => {
  const result = click({ href: '' }, 'Abrir galeria');
  assert.equal(result.prevented, false);
  assert.equal(result.stopped, false);
});
