import projects from '../content/projects.json' with { type: 'json' };

const escape = (value) => String(value).replace(/[&<>"']/gu,
  (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

/** Finalized photographs keep the display, bezel and glass in one image. */
export function projectMockup(project, kind = 'monitor') {
  const label = `${kind === 'monitor' ? 'Monitor' : 'Notebook'} com o site de ${project.name} em português`;
  const version = project.assetVersion ?? 9;
  return `<img class="project-mockup" src="/assets/images/cases/collection/${project.slug}-${kind}.jpg?v=${version}" alt="${escape(label)}" width="2880" height="2160" decoding="async" ${kind === 'monitor' ? `srcset="/assets/images/cases/collection/${project.slug}-monitor-720.jpg?v=${version} 720w, /assets/images/cases/collection/${project.slug}-monitor.jpg?v=${version} 2880w" sizes="(min-width: 1200px) 344px, (min-width: 600px) 50vw, 100vw"` : ''} ${kind === 'monitor' ? 'loading="lazy"' : 'fetchpriority="high"'} />`;
}

export function projectGrid() {
  return `<section class="project-collection" aria-labelledby="collection-title" id="more-projects">
    <div class="project-collection__heading">
      <h2 class="rich-text text-subheading" id="collection-title">Outros projetos.</h2>
      <p class="rich-text text-body text-muted">Arquitetura, interiores e desenvolvimento imobiliário.</p>
    </div>
    <div class="project-collection__grid">${projects.map((project) => `
      <a class="project-collection__card" href="/projects/${project.slug}" aria-label="Ver case de ${escape(project.name)}" data-reveal="element" data-reveal-offset="34">
        <div class="project-collection__media">${projectMockup(project)}</div>
        <div class="project-collection__caption">
          <div><h3 class="rich-text text-title">${escape(project.name)}</h3><p class="rich-text text-caption text-muted">${escape(project.category)}</p></div>
          <svg class="project-collection__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
        </div>
      </a>`).join('')}
    </div>
  </section>`;
}

function palette(project) {
  return `<div class="case-palette"><h2 class="rich-text text-caption">Paleta do estudo</h2>
    <ul aria-label="Cores de ${escape(project.name)}">${project.palette.map(([name, color]) => `
      <li><span style="--case-swatch:${color}" aria-hidden="true"></span><span>${escape(name)}<small>${color}</small></span></li>`).join('')}
    </ul></div>`;
}

export function renderPortfolio(document, path) {
  if (path === '/' || path === '/index.html') return document.replace('<!-- project-collection -->', projectGrid());
  const project = projects.find(({ slug }) => path === `/projects/${slug}`);
  if (!project) return document;
  const index = projects.indexOf(project);
  const previous = projects[(index + projects.length - 1) % projects.length];
  const next = projects[(index + 1) % projects.length];
  const fields = {
    name: escape(project.name), slug: project.slug, category: escape(project.category),
    description: escape(project.description), headline: escape(project.headline),
    overview: project.overview.map((paragraph) => `<p class="rich-text text-body text-muted" dir="auto">${escape(paragraph)}</p>`).join('<hr />'),
    identity: escape(project.identity), mockup: projectMockup(project, 'notebook'), palette: palette(project),
    previousName: escape(previous.name), previousSlug: previous.slug,
    nextName: escape(next.name), nextSlug: next.slug,
  };
  return document.replace(/\{\{(\w+)\}\}/gu, (token, key) => fields[key] ?? token);
}
