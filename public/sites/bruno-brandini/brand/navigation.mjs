import { installDocumentNavigation } from '/i18n/document-navigation.mjs?v=27';

installDocumentNavigation('bruno-brandini');

if (document.documentElement.hasAttribute('data-brandini-project')) {
  const closeMenus = () => {
    for (const menu of document.querySelectorAll('.brandini-menu-open')) {
      menu.classList.remove('brandini-menu-open');
      menu.querySelector('[data-framer-name="Menu"]')?.setAttribute('aria-expanded', 'false');
    }
  };
  for (const trigger of document.querySelectorAll('[data-framer-name="Menu"]')) {
    const header = trigger.closest('.framer-Y3CbG');
    if (!header) continue;
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const open = !header.classList.contains('brandini-menu-open');
      closeMenus();
      if (open) {
        header.classList.add('brandini-menu-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    };
    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
    });
    for (const link of header.querySelectorAll('[data-framer-name="Header Menu"] a')) {
      const heading = link.parentElement;
      const label = heading.textContent.trim();
      link.textContent = label;
      for (const node of [...heading.childNodes]) if (node !== link) node.remove();
      if (label === 'Início') link.href = '/bruno-brandini';
    }
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenus(); });
  // Animate on entry without ever storing a hidden state in the document.
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        entry.target.animate([{opacity: .55, transform: 'translateY(18px)'}, {opacity: 1, transform: 'none'}], {duration: 550, easing:'cubic-bezier(.22,.61,.36,1)'});
      }
    }, {threshold: .12});
    for (const element of document.querySelectorAll('[data-framer-name="Gallery Card"], [data-framer-name="Approach Image"], [data-framer-name="Highlights Card Block"]')) observer.observe(element);
  }
}
