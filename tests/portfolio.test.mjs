import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import projects from '../content/projects.json' with { type: 'json' };
import { GET } from '../app/[[...route]]/route.js';
import { studioTarget } from '../public/i18n/studio-links.mjs';

async function html(path) {
  const response = await GET(new Request('http://localhost' + path), {
    params: Promise.resolve({ route: path.split('/').filter(Boolean) }),
  });
  assert.equal(response.status, 200, path);
  return response.text();
}

test('runtime links keep each studio prefix through client navigation', () => {
  for (const { slug } of projects) {
    const section = slug === 'totnt' ? 'empreendimentos' : 'about';
    assert.equal(studioTarget(slug, `./${section}`, 'https://grupoduothink.com.br'), `/${slug}/${section}`, slug);
    assert.equal(studioTarget(slug, '/', 'https://grupoduothink.com.br'), `/${slug}`, slug);
    assert.equal(studioTarget(slug, `./${slug}/${section}?origem=menu#equipe`, 'https://grupoduothink.com.br'), `/${slug}/${section}?origem=menu#equipe`, slug);
    assert.equal(studioTarget(slug, '#services', 'https://grupoduothink.com.br'), null);
    assert.equal(studioTarget(slug, 'https://example.org/about', 'https://grupoduothink.com.br'), null);
  }
});

test('the nine additional cards appear once in alphabetical order, after the original cases', async () => {
  const home = await html('/');
  const cards = [...home.matchAll(/class="project-collection__card" href="\/projects\/([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(cards, ['bruno-brandini', 'calibre', 'cavora', 'forma', 'grid', 'housemood', 'intera', 'korda', 'totnt']);
  assert.ok(home.indexOf('href="/projects/zeta"') < home.indexOf('id="more-projects"'));
  assert.equal((home.match(/class="project-mockup"/gu) ?? []).length, 9);
  for (const { slug, assetVersion = 9 } of projects) assert.ok(home.includes(`/collection/${slug}-monitor.jpg?v=${assetVersion}`));
});

test('each additional case uses one finalized notebook image, palette, identity and animated access', async () => {
  for (const project of projects) {
    const page = await html('/projects/' + project.slug);
    assert.doesNotMatch(page, /\{\{\w+\}\}/u);
    assert.equal((page.match(/class="project-mockup"/gu) ?? []).length, 1, project.slug);
    assert.ok(page.includes(`/collection/${project.slug}-notebook.jpg?v=${project.assetVersion ?? 9}`));
    assert.doesNotMatch(page, /<svg class="project-mockup"|clipPath|O site em outras telas/u);
    for (const kind of ['monitor', 'notebook']) {
      const finalImage = await readFile(new URL(`../public/assets/images/cases/collection/${project.slug}-${kind}.jpg`, import.meta.url));
      assert.equal(finalImage.readUInt16BE(0), 0xffd8, project.slug);
    }
    assert.ok(page.includes(project.identity));
    for (const [, color] of project.palette) assert.ok(page.includes(color), project.slug);
    const button = page.match(/<a[^>]*aria-label="Acessar site de [^>]+>/u)?.[0];
    assert.ok(button?.includes(`href="/${project.slug}"`), project.slug);
    assert.ok(button.includes('data-reveal="element"'));
    const thumbnail = await readFile(new URL(`../public/assets/images/cases/collection/${project.slug}-monitor-720.jpg`, import.meta.url));
    assert.equal(thumbnail.readUInt16BE(0), 0xffd8, project.slug);
  }
});

test('Bruno Brandini replaces Archevo throughout the DuoThink portfolio entry', async () => {
  const home = await html('/');
  assert.match(home, /<h3 class="rich-text text-title">Bruno Brandini<\/h3>/u);
  assert.doesNotMatch(home, /Archevo|\/projects\/archevo|\/collection\/archevo-/u);
  assert.match(home, /bruno-brandini-monitor-720\.jpg\?v=27/u);
  const page = await html('/projects/bruno-brandini');
  assert.match(page, /href="\/bruno-brandini"/u);
  assert.doesNotMatch(page, /Archevo/u);
  for (const [oldPath, destination] of [['/archevo', '/bruno-brandini'], ['/projects/archevo', '/projects/bruno-brandini']]) {
    const response = await GET(new Request('http://localhost' + oldPath), {
      params: Promise.resolve({ route: oldPath.split('/').filter(Boolean) }),
    });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), destination);
  }
});

test('Bruno Brandini keeps original team portraits and moves architecture photographs to project galleries', async () => {
  const team = await html('/bruno-brandini/team');
  const about = await html('/bruno-brandini/about');
  for (const id of ['jtxPBy4PrrcHf7QiCwoyPmVqHyI', 'dcibVGtJqF90YsVMCl58IvSiA4', 'aX81roYAAcAq1pBQVibsAK5hk2Q',
    'olV0Pah6lU9faIuT0erZwhUTnA', 'OTJmwDBU67gp3Jfjtx0IbsT43A', 'ordjqIxVLiRD2JDE2tzvRNFULI',
    'P6g86PNSCZCIGgZ0eHwc5L7dTI', '9vyjDYnyQkc41LjWJ41shyQi78', 'CYJ6HowC0FCfooZZ8RytKBc6dhg']) {
    assert.ok(team.includes(`/brand/team-original/${id}.png`), id);
    const photograph = await readFile(new URL(`../public/sites/bruno-brandini/brand/team-original/${id}.png`, import.meta.url));
    assert.ok(photograph.byteLength > 10000, id);
  }
  for (const id of ['WXwtuZmK3ybi3TGlNZnkf6SAzz4', 'B5tZKCYuSY2gf1wtFwNBORQ1Izs']) {
    assert.ok(about.includes(`/brand/team-original/${id}.png`), id);
  }
  const covers = {
    'terran-courtyard-residence': 'facade.png',
    'horizon-residence': 'living.png',
    'serene-interior-loft': 'original-01.jpg',
    'urban-green-space': 'original-09.jpg',
    'coastal-resort-retreat': 'original-03.jpg',
  };
  const allGalleryPhotos = new Set();
  for (const [slug, cover] of Object.entries(covers)) {
    const project = await html(`/bruno-brandini/projects/${slug}`);
    const photos = [...project.matchAll(/data-framer-name="Gallery Image"[^>]*>\s*<div[^>]*>\s*<img[^>]*\bsrc="([^"?]+)"/gu)].map(match => match[1]);
    assert.equal(photos.length, 7, slug);
    const distinct = new Set(photos);
    assert.equal(distinct.size, 6, slug);
    for (const path of distinct) {
      assert.ok(!allGalleryPhotos.has(path), `${slug}: ${path}`);
      allGalleryPhotos.add(path);
      assert.ok((await readFile(new URL(`../public${path}`, import.meta.url))).byteLength > 10000);
    }
    const main = project.match(/data-framer-name="Global Image"[^>]*>\s*<div[^>]*>\s*<img[^>]*\bsrc="([^"?]+)\?/u);
    assert.ok(main?.[1].endsWith(`/brand/${cover}`), slug);
  }
  assert.equal(allGalleryPhotos.size, 30);
  assert.ok([...allGalleryPhotos].some(path => path.includes('/team-original/')));
  const service = await html('/bruno-brandini/services/architectural-design');
  assert.match(service, /id="brandini-photo-variation"/u);
  assert.match(service, /content: url\("\/sites\/bruno-brandini\/brand\/team-original\//u);
});
