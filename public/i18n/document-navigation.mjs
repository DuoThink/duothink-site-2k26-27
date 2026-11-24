import { studioTarget } from './studio-links.mjs';

/** Let Next serve the complete document for mounted template pages. */
export function installDocumentNavigation(slug, {
  root = window,
  currentURL = () => location.href,
  navigate = (target) => location.assign(target),
} = {}) {
  const onClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || anchor.getAttribute('aria-disabled') === 'true') return;
    const targetWindow = anchor.getAttribute('target');
    if (targetWindow && targetWindow !== '_self') return;
    const current = new URL(currentURL());
    const target = studioTarget(slug, anchor.getAttribute('href'), current.origin);
    if (!target) return;
    const destination = new URL(target, current.origin);
    if (destination.pathname === current.pathname && destination.search === current.search) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(target);
  };
  root.addEventListener('click', onClick, true);
  return () => root.removeEventListener('click', onClick, true);
}
