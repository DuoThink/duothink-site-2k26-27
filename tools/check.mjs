import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import site from '../site.json' with { type: 'json' };
import { renderPortfolio } from '../app/portfolio.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
let failures = 0;
let resources = 0;

function fail(message) {
  failures += 1;
  console.error(message);
}

async function filesAt(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesAt(filename));
    else files.push(filename);
  }
  return files;
}

async function localResource(reference, owner) {
  if (!reference.startsWith('/') || reference.startsWith('//')) return;
  const pathname = decodeURIComponent(reference.split(/[?#]/u)[0]);
  const route = pathname.replace(/\/+$/u, '') || '/';
  if (route === '/api/contact' || route === '/404' || Object.hasOwn(site.pages, route)
      || Object.hasOwn(site.redirects, route)) return;
  try {
    const file = path.join(root, 'public', pathname);
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    resources += 1;
  } catch {
    fail(`Recurso ausente em ${path.relative(root, owner)} — ${reference}`);
  }
}

for (const [route, filename] of Object.entries(site.pages)) {
  if (!route.startsWith('/') || filename.split('/').includes('..')) fail(`Caminho inválido — ${route}`);
  await stat(path.join(root, 'pages-original', filename)).catch(() => fail(`Página ausente — ${route}`));
}

const files = (await Promise.all(['app', 'pages-original', 'public', 'tests', 'tools']
  .map((directory) => filesAt(path.join(root, directory))))).flat();
for (const filename of files) {
  if (/\.(js|mjs)$/u.test(filename)) {
    const syntax = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
    if (syntax.status !== 0) fail(syntax.stderr);
  }
  if (!/\.(html|css|js|mjs)$/u.test(filename)) continue;
  let source = await readFile(filename, 'utf8');
  if (filename.endsWith('.html')) {
    const relative = path.relative(path.join(root, 'pages-original'), filename).split(path.sep).join('/');
    const routes = Object.entries(site.pages).filter(([, file]) => file === relative).map(([route]) => route);
    source = routes.map((route) => renderPortfolio(source, route)).join('\n') || source;
  }
  if (filename.endsWith('.html')) {
    if (!/<title>[^<]+<\/title\s*>/u.test(source)) fail(`Título ausente — ${filename}`);
    if (!/<html[^>]+lang="pt-BR"/u.test(source)) fail(`Idioma ausente — ${filename}`);
    for (const match of source.matchAll(/(?:src|href|action|poster)="([^"]+)"/gu))
      await localResource(match[1].replaceAll('&amp;', '&'), filename);
    for (const match of source.matchAll(/srcset="([^"]+)"/gu)) {
      for (const item of match[1].split(',')) await localResource(item.trim().split(/\s+/u)[0], filename);
    }
  }
  if (filename.endsWith('.css')) {
    for (const match of source.matchAll(/url\(["']?([^"')]+)["']?\)/gu))
      await localResource(match[1], filename);
  }
  if (/\.(js|mjs)$/u.test(filename)) {
    for (const match of source.matchAll(/(?:from\s*|import\()\s*['"](\.[^'"]+|\/[^'"]+)['"]/gu)) {
      if (match[1].startsWith('/')) await localResource(match[1], filename);
      else {
        const imported = path.resolve(path.dirname(filename), match[1].split(/[?#]/u)[0]);
        await stat(imported).catch(() => fail(`Módulo ausente — ${filename} → ${match[1]}`));
      }
    }
  }
}

console.log(`${Object.keys(site.pages).length} caminhos e ${resources} referências locais conferidos.`);
process.exitCode = failures ? 1 : 0;
