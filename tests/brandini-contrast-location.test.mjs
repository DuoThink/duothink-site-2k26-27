import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('all Brandini project details use adaptive photo text contrast', async () => {
  const css = await read('public/sites/bruno-brandini/brand/photography.css');
  assert.match(css, /\[data-framer-name="Our Work Text"\]\s*\{[^}]*mix-blend-mode:\s*difference/);
  assert.match(css, /\[data-framer-name="Our Work Text"\] \.framer-text\s*\{[^}]*color:\s*#fff !important/);
  const dir = new URL('pages-original/bruno-brandini/projects/', root);
  const projects = (await readdir(dir, { withFileTypes: true })).filter(item => item.isDirectory());
  assert.equal(projects.length, 5);
  for (const project of projects) {
    const html = await read(`pages-original/bruno-brandini/projects/${project.name}/index.html`);
    assert.match(html, /data-brandini-project/);
    assert.match(html, /data-framer-name="Our Work Text"/);
    assert.match(html, /photography\.css\?v=29/);
  }
});

test('Brandini contact location stays in São Paulo before and after hydration', async () => {
  const html = await read('pages-original/bruno-brandini/contact/index.html');
  const main = await read('public/sites/bruno-brandini/script_main.C61Mfo8X.mjs');
  const module = main.match(/aa2f1d301c04-[\w.-]+-sp\.mjs/)[0];
  const contact = await read(`public/sites/bruno-brandini/modules/${module}`);
  assert.match(html, /<iframe[^>]* src="https:\/\/www\.google\.com\/maps\?q=S%C3%A3o%20Paulo%2C%20SP%2C%20Brasil&amp;z=12&amp;output=embed"/);
  assert.doesNotMatch(html, /<p\b[^>]*>\s*Brasil\s*<\/p>/);
  assert.match(contact, /coordinates:`São Paulo, SP, Brasil`/);
  assert.match(contact, /width:`100%`,zoom:12\}/);
  assert.doesNotMatch(contact, /Framer B\.V\.|children:" ?Brasil"/);
  assert.doesNotMatch(main, /google\.com\/maps\/place\/27th\+Ave/);
  assert.match(main, /google\.com\/maps\/search\/\?api=1&query=S%C3%A3o%20Paulo%2C%20SP%2C%20Brasil/);
});
