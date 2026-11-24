import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {join} from 'node:path';
import site from '../site.json' with {type:'json'};
const root=new URL('../',import.meta.url).pathname;
const visible=html=>html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu,'').replace(/<!--[^]*?-->/gu,'').replace(/<[^>]*>/gu,' ').replace(/\s+/gu,' ').trim();
const compact=text=>text.replace(/\s+/gu,'');
const home={cakra:'Criamos arquitetura atemporal',viresta:'Ideias Formadas em Arquitetura.',zeta:'Criamos edifícios com precisão.','bruno-brandini':'Criamos espaços inspiradores',calibre:'Interiores com propósito',cavora:'Interiores para você!',forma:'Somos um estúdio de design',grid:'Soluções de design e construção',housemood:'Sua casa é',intera:'Estúdio Intera.',korda:'Interiores comerciais',totnt:'Desenvolvemos empreendimentos'};
test('all twelve studio homepages arrive in Portuguese before JavaScript executes',async()=>{
 for(const[slug,text]of Object.entries(home)){
  const html=await readFile(join(root,'pages-original',site.pages['/'+slug]),'utf8');
  assert.ok(compact(visible(html)).includes(compact(text)),slug);
  assert.match(html,/lang="pt-BR"/u,slug);
  assert.match(html,/data-duo-localized="source"/u,slug);
 }
});
test('every studio route uses source translations and a local versioned runtime',async()=>{
 for(const[route,file]of Object.entries(site.pages)){
  if(!Object.keys(site.studios).some(s=>route==='/'+s||route.startsWith('/'+s+'/')))continue;
  const html=await readFile(join(root,'pages-original',file),'utf8');
  assert.doesNotMatch(html,/<script[^>]+src="[^"]*\/i18n\/localize\.mjs/u,route);
  assert.doesNotMatch(html,/(?:src|href)="https:\/\/framerusercontent\.com\/[^" ]+\.mjs/u,route);
  assert.doesNotMatch(visible(html),/\b(?:All rights reserved|Enable JavaScript to submit this form|This page doesn’t exist|Get in touch!|Read More|Our Services)\b/u,route);
  if (/^\/bruno-brandini\/projects\/[^/]+$/u.test(route)) {
    assert.match(html,/data-brandini-project="true"/u,route);
    assert.match(html,/src="\/sites\/bruno-brandini\/brand\/navigation\.mjs\?v=28"/u,route);
    assert.doesNotMatch(html,/data-framer-bundle="main"/u,route);
  } else if(route!=='/totnt/404')assert.match(html,/data-framer-bundle="main"[^>]*src="\/sites\/[^"]+lang=pt-BR/u,route);
 }
});
async function* modules(dir){for(const file of await readdir(dir,{withFileTypes:true})){const path=join(dir,file.name);if(file.isDirectory())yield*modules(path);else if(/\.(?:mjs|js)$/.test(path))yield path;}}
test('the localized runtime has no unresolved relative or remote content-module imports',async()=>{
 for await(const file of modules(join(root,'public/sites'))){
  const code=await readFile(file,'utf8');
  for(const[,ref]of code.matchAll(/(?:from|import\()\s*["'`]([^"'`]+)["'`]/gu)){
   if(ref.startsWith('https://framer.com/edit/'))continue;
   assert.ok(!ref.startsWith('http')&&!ref.startsWith('.'),`${file}: ${ref}`);
   if(ref.startsWith('/sites/'))await access(join(root,'public',ref));
  }
 }
});
test('studio URL identifiers remain compatible with the Portuguese navigation',async()=>{
 const html=await readFile(join(root,'pages-original/bruno-brandini/index.html'),'utf8');
 assert.match(html,/\/bruno-brandini\/blog-categories\/architecture/u);
 assert.doesNotMatch(html,/\/bruno-brandini\/blog-categories\/arquitetura/u);
});

test('every live collection reads a local Portuguese catalog rather than the template database',async()=>{
 const covered=new Set();let catalogs=0;
 for await(const file of modules(join(root,'public/sites'))){
  const code=await readFile(file,'utf8');
  for(const[,chunks]of code.matchAll(/chunks:\[([^\]]+)\]/gu)){
   if(!chunks.includes('.framercms'))continue;
   assert.doesNotMatch(chunks,/https:\/\//u,file);
   const paths=[...chunks.matchAll(/"(\/sites\/([^/]+)\/data\/[^" ]+-pt-BR\.framercms)"/gu)];
   assert.ok(paths.length,file);
   for(const[,asset,studio]of paths){await access(join(root,'public',asset));covered.add(studio);catalogs++;}
  }
 }
 assert.deepEqual([...covered].sort(),Object.keys(site.studios).sort());
 assert.ok(catalogs>=12);
});

test('serialized article and project content remains Portuguese after hydration',async()=>{
 const examples={
  viresta:{pt:'Uma exploração da luz, da proporção, dos materiais',en:'An exploration of light, proportion, material and connection to place.'},
  cakra:{pt:'A luz natural orienta o projeto.',en:'Courtyard Residence was envisioned as a modern sanctuary'},
  korda:{pt:'Começamos com o sol.',en:'We start with the sun.'}
 };
 for(const[studio,{pt,en}]of Object.entries(examples)){
  const directory=join(root,'public/sites',studio,'data');
  const files=(await readdir(directory)).filter(f=>f.endsWith('-pt-BR.framercms'));
  const catalogs=await Promise.all(files.map(f=>readFile(join(directory,f))));
  assert.ok(catalogs.some(buffer=>buffer.includes(Buffer.from(pt))),studio);
  assert.ok(catalogs.every(buffer=>!buffer.includes(Buffer.from(en))),studio);
 }
});

test('animated project copy uses a coherent Portuguese sentence in the initial HTML',async()=>{
 const html=await readFile(join(root,'pages-original/bruno-brandini/projects/horizon-residence/index.html'),'utf8');
 const text=visible(html);
 assert.doesNotMatch(text,/\bWill\b|O que é isso/u);
 assert.match(text,/escuta:/u);
 assert.match(text,/terreno,/u);
 assert.doesNotMatch(html,/HTML Website Template/u);
});
