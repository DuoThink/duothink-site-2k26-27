import assert from 'node:assert/strict';
import test from 'node:test';
import { installDocumentNavigation } from '../public/i18n/document-navigation.mjs';

function setup() {
  let listener;
  const visits = [];
  const root = {
    addEventListener(type, handler, capture) { assert.equal(type, 'click'); assert.equal(capture, true); listener = handler; },
    removeEventListener(type, handler, capture) { assert.equal(type, 'click'); assert.equal(handler, listener); assert.equal(capture, true); listener = null; },
  };
  const remove = installDocumentNavigation('bruno-brandini', {
    root, currentURL: () => 'http://localhost:3000/bruno-brandini', navigate: (href) => visits.push(href),
  });
  return {
    visits, remove,
    click(href, { attributes = {}, ...overrides } = {}) {
      const anchor = { getAttribute: (key) => key === 'href' ? href : attributes[key], hasAttribute: (key) => key in attributes };
      const event = { button: 0, target: { closest: () => anchor }, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...overrides };
      listener(event);
      return event;
    },
  };
}

test('project clicks navigate to a complete Next document before the template router runs', () => {
  const state = setup();
  for (const slug of ['terran-courtyard-residence', 'horizon-residence', 'urban-green-space', 'coastal-resort-retreat', 'serene-interior-loft']) {
    const target = `/bruno-brandini/projects/${slug}`;
    const event = state.click(target);
    assert.equal(state.visits.at(-1), target);
    assert.ok(event.prevented && event.stopped);
  }
  state.click('https://archevo.framer.website/projects/horizon-residence?origem=menu#details');
  assert.equal(state.visits.at(-1), '/bruno-brandini/projects/horizon-residence?origem=menu#details');
  state.remove();
});

test('document navigation preserves page anchors, external links and browser link gestures', () => {
  const state = setup();
  for (const [href, options] of [
    ['#about', {}], ['/bruno-brandini#about', {}], ['https://example.org', {}],
    ['/bruno-brandini/projects/horizon-residence', { ctrlKey: true }],
    ['/bruno-brandini/projects/horizon-residence', { metaKey: true }],
    ['/bruno-brandini/projects/horizon-residence', { button: 1 }],
    ['/bruno-brandini/projects/horizon-residence', { attributes: { target: '_blank' } }],
    ['/bruno-brandini/projects/horizon-residence', { attributes: { download: '' } }],
  ]) {
    const event = state.click(href, options);
    assert.ok(!event.prevented && !event.stopped, href);
  }
  assert.deepEqual(state.visits, []);
});

import { readFile } from 'node:fs/promises';
import site from '../site.json' with { type: 'json' };

test('all five Bruno Brandini project documents are independently readable and link to a real next project', async () => {
  const paths = Object.keys(site.pages).filter(path => /^\/bruno-brandini\/projects\/[^/]+$/u.test(path));
  assert.equal(paths.length, 5);
  for (const path of paths) {
    const html = await readFile(new URL(`../pages-original/${site.pages[path]}`, import.meta.url), 'utf8');
    assert.match(html, /data-brandini-project="true"/u);
    assert.doesNotMatch(html, /data-framer-bundle="main"|will-change:transform;opacity:0;transform:translateY\((?:30|50)px\)/u);
    const next = html.match(/data-framer-name="Next Text Block" href="([^"]+)"/u)?.[1];
    assert.ok(paths.includes(next), `${path} → ${next}`);
    assert.match(html, /data-framer-name="Approach Image"/u);
    for (const [, image] of html.matchAll(/<img\b[^>]*\bsrc="(\/sites\/bruno-brandini\/brand\/[^"?]+)(?:\?[^"]*)?"/gu)) {
      assert.ok((await readFile(new URL(`../public${image}`, import.meta.url))).length > 0, image);
    }
  }
});
