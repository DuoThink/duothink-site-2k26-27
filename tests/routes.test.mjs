import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import site from '../site.json' with { type: 'json' };
import { GET } from '../app/[[...route]]/route.js';
import { GET as unsupported, POST } from '../app/api/contact/route.js';

function page(path) {
  return GET(new Request('http://localhost' + path), {
    params: Promise.resolve({ route: path.split('?')[0].split('/').filter(Boolean) }),
  });
}

test('the DuoThink pages and every mounted studio page are served', async () => {
  for (const path of Object.keys(site.pages)) {
    const response = await page(path);
    if (path === '/index.html') {
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), '/');
      continue;
    }
    const isStudio404 = Object.keys(site.studios).some((slug) => path === `/${slug}/404`);
    assert.equal(response.status, isStudio404 ? 404 : 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/u);
    assert.match(await response.text(), /lang="pt-BR"/u, path);
  }
});

test('studio links stay inside their own site', async () => {
  for (const [path, filename] of Object.entries(site.pages)) {
    const studio = Object.keys(site.studios).find((slug) => path === `/${slug}` || path.startsWith(`/${slug}/`));
    if (!studio) continue;
    const contents = await readFile(new URL('../pages-original/' + filename, import.meta.url), 'utf8');
    for (const match of contents.matchAll(/<a\s[^>]*href="([^"#]+)"/gu)) {
      const target = match[1].split(/[?#]/u)[0];
      if (target.startsWith('/') && !target.startsWith('//')) {
        assert.ok(target === `/${studio}` || target.startsWith(`/${studio}/`), `${path} → ${target}`);
        assert.ok(Object.hasOwn(site.pages, target), `${path} → ${target}`);
      }
    }
  }
});

test('each case provides access to its corresponding website', async () => {
  for (const slug of Object.keys(site.studios)) {
    const contents = await (await page('/projects/' + slug)).text();
    assert.match(contents, new RegExp(`href="/${slug}" aria-label="Acessar site de `));
  }
});

test('the example spelling redirects while preserving query parameters', async () => {
  const response = await page('/cakro?origem=case');
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/cakra?origem=case');
});

test('legacy HTML addresses redirect to the corresponding Next routes', async () => {
  const response = await page('/zeta/services/interior-design/index.html?origem=antigo');
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/zeta/services/interior-design?origem=antigo');
});

test('missing pages have the appropriate branded 404 and source files stay private', async () => {
  for (const path of ['/.env', '/site.json', '/pages-original/index.html', '/app/contact.js',
    '/projects/bloom-co', '/missing', '/cakra/missing', '/viresta/missing', '/zeta/missing']) {
    const response = await page(path);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /<title>/u);
  }
});

test('the Next contact endpoint preserves method, origin and body validation', async () => {
  assert.equal(unsupported().status, 405);
  for (const [body, headers, expected] of [
    ['{}', { 'Content-Type': 'application/json', Origin: 'https://unrelated.example' }, 403],
    ['{}', { 'Content-Type': 'text/plain' }, 415],
    ['{broken', { 'Content-Type': 'application/json' }, 400],
    ['{}', { 'Content-Type': 'application/json' }, 400],
    ['x'.repeat(12_001), { 'Content-Type': 'application/json' }, 413],
  ]) {
    const request = new Request('http://localhost/api/contact', { method: 'POST', body, headers });
    assert.equal((await POST(request)).status, expected);
  }
});
