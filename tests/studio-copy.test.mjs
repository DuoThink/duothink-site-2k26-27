import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import site from '../site.json' with { type: 'json' };
import { studioEmail, studioLink } from '../public/i18n/studio-identity.mjs';

const root = new URL('../', import.meta.url).pathname;
const studios = Object.keys(site.studios);
const visible = html => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, '')
  .replace(/<!--[^]*?-->/gu, '').replace(/<br\b[^>]*>|<\/(?:p|h[1-6]|li|div|label)>/giu, ' ').replace(/<[^>]*>/gu, '').replace(/\s+/gu, ' ');

test('all displayed email addresses and email links use the requested demo contact', async () => {
  let addresses = 0;
  for (const slug of studios) {
    const directory = join(root, 'pages-original', slug);
    for (const file of await readdir(directory, { recursive: true })) {
      if (!file.endsWith('.html')) continue;
      const html = await readFile(join(directory, file), 'utf8');
      const copy = visible(html);
      for (const [email] of copy.matchAll(/[\w.+-]+@(?:[\w-]+\.)+[a-z]{2,}/giu)) {
        assert.equal(email, studioEmail, `${slug}/${file}`); addresses++;
      }
      for (const [,href] of html.matchAll(/href="(mailto:[^"]*)"/giu)) assert.equal(href, `mailto:${studioEmail}`, `${slug}/${file}`);
      assert.doesNotMatch(copy, /\b(?:Nova York|New York|Jacarta|Indonésia|Bangladesh|Washington Ave|França|Hong Kong|Kentucky)\b/iu, `${slug}/${file}`);
    }
  }
  assert.ok(addresses > 100);
  assert.equal(studioLink('mailto:old@example.org?subject=Projeto'), `mailto:${studioEmail}`);
});

test('animated copy preserves readable words, spacing and complete footer credits in the initial document', async () => {
  const cases = [
    ['calibre/about/index.html', 'Criamos interiores confortáveis e funcionais, com materiais duráveis e soluções pensadas para cada rotina.'],
    ['korda/index.html', 'Design além das tendências. Receba novidades do estúdio.'],
    ['zeta/index.html', 'Desenvolvido por DuoThink.'],
  ];
  for (const [file, expected] of cases) {
    const html = await readFile(join(root,'pages-original',file),'utf8');
    assert.ok(visible(html).includes(expected), file);
  }
});

test('the policy contact block keeps complete and correctly associated email, telephone and map links', async () => {
  for (const file of ['privacy-policy','terms-and-conditions']) {
    const html = await readFile(join(root, 'pages-original/cavora', file, 'index.html'), 'utf8');
    assert.match(html, /href="mailto:contato@email\.com"[^>]*>E-mail: contato@email\.com<\/a>/u);
    assert.match(html, /href="tel:\+0000000000000"[^>]*>Telefone: \+00 \(00\) 00000-0000<\/a>/u);
    assert.ok(visible(html).includes('Rua dos Jardins, 180, Campinas — SP'));
    assert.doesNotMatch(visible(html), /Stylium|Estilio|Washington|Kentucky/u);
  }
});
