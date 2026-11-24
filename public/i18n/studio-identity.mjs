export const studioCredit = 'Desenvolvido por DuoThink';
export const studioEmail = 'contato@email.com';
export const studioPhone = '+00 (00) 00000-0000';
export const studioTelephone = 'tel:+0000000000000';
export const studioInstagram = 'https://www.instagram.com/duo.think/';

const networks = new Map([
  ['instagram.com', 'instagram'], ['instragram.com', 'instagram'],
  ['facebook.com', 'facebook'], ['fb.com', 'facebook'],
  ['linkedin.com', 'linkedin'], ['x.com', 'twitter'], ['twitter.com', 'twitter'],
  ['youtube.com', 'youtube'], ['youtu.be', 'youtube'], ['vimeo.com', 'vimeo'],
  ['behance.net', 'behance'], ['dribbble.com', 'dribbble'],
  ['pinterest.com', 'pinterest'], ['threads.net', 'threads'],
  ['tiktok.com', 'tiktok'], ['reddit.com', 'reddit'],
  ['telegram.me', 'telegram'], ['t.me', 'telegram'],
  ['wa.me', 'whatsapp'], ['whatsapp.com', 'whatsapp'],
  ['discord.gg', 'discord'], ['discord.com', 'discord'],
  ['snapchat.com', 'snapchat'], ['bsky.app', 'bluesky'],
]);
const creatorDomains = new Set([
  'fourtwelve.co', 'tncflow.com', 'fluxtemplates.com', 'designmonks.co',
  'lunisdesign.com', 'dosspropaganda.com.br',
]);
const labelPattern = /^(?:(?:compartilhar|share)(?:\s+(?:on|no|na|em))?\s+)?(?:\/\/)?(instagram|facebook|linkedin|twitter|x(?:\s*\(twitter\))?|youtube|behance|dribbble|pinterest|threads|tiktok|reddit|telegram|whatsapp|vimeo)$/iu;

function urlOf(reference) {
  if (typeof reference !== 'string' || !/^(?:https?:\/\/|\/\/)/iu.test(reference)) return null;
  try { return new URL(reference.startsWith('//') ? `https:${reference}` : reference); }
  catch { return null; }
}

export function socialNetwork(reference) {
  const url = urlOf(reference);
  if (!url) return /^(?:whatsapp|fb|twitter|linkedin|instagram):/iu.exec(reference || '')?.[0]?.replace(':', '').toLowerCase() || null;
  const host = url.hostname.toLowerCase();
  for (const [domain, network] of networks) {
    if (host === domain || host.endsWith(`.${domain}`)) return network;
  }
  return null;
}

export function networkLabel(label) {
  return String(label || '').trim().match(labelPattern)?.[1]?.toLowerCase() || null;
}

export function isMediaOrSharingService(reference) {
  const url = urlOf(reference);
  if (!url) return /^(?:whatsapp|fb|twitter|linkedin|instagram):/iu.test(reference || '');
  return /\/(?:embed|watch|intent|sharer|sharing|dialog|pin\/create|submit)(?:[/.?]|$)/iu.test(url.pathname)
    || (url.hostname === 'wa.me' && url.pathname === '/');
}

export function studioLink(reference, { preserveServices = false } = {}) {
  if (typeof reference !== 'string') return reference;
  if (/^mailto:/iu.test(reference)) return `mailto:${studioEmail}`;
  if (/^tel:/iu.test(reference)) return studioTelephone;
  const url = urlOf(reference);
  const network = socialNetwork(reference);
  if (network) {
    if (preserveServices && isMediaOrSharingService(reference)) return reference;
    return network === 'instagram' ? studioInstagram : '';
  }
  if (url) {
    const host = url.hostname.toLowerCase().replace(/^www\./u, '');
    if (creatorDomains.has(host) || (host === 'framer.com' && /^\/@(?:bob-lejeune|tymofii-bak)\/?$/u.test(url.pathname))) return '';
  }
  if (/^(?:www\.)?lunisdesign\.com\/?$/iu.test(reference)) return '';
  return reference;
}

const installedDocuments = new WeakSet();

export function guardStudioIdentityClick(event) {
  const anchor = event.target?.closest?.('a');
  if (!anchor) return;
  const network = anchor.getAttribute('data-duo-social') || socialNetwork(anchor.getAttribute('href'))
    || networkLabel(anchor.getAttribute('aria-label')) || networkLabel(anchor.getAttribute('title'))
    || networkLabel(anchor.getAttribute('data-framer-name'));
  const credit = /^(?:Desenvolvido por\s+)?DuoThink\.?$/u.test(anchor.textContent.trim());
  if (network === 'instagram') {
    anchor.setAttribute('href', studioInstagram);
    event.stopImmediatePropagation();
  } else if (network || (credit && anchor.getAttribute('href') === '')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

export function installStudioIdentity(doc = document) {
  if (installedDocuments.has(doc)) return;
  installedDocuments.add(doc);
  const normalize = () => {
    for (const anchor of doc.querySelectorAll('a')) {
      const href = anchor.getAttribute('href');
      if (/^mailto:/iu.test(href || '') && href !== `mailto:${studioEmail}`) anchor.setAttribute('href', `mailto:${studioEmail}`);
      const label = anchor.getAttribute('data-duo-social') || networkLabel(anchor.getAttribute('aria-label'));
      const network = socialNetwork(href) || label;
      if (network) {
        anchor.setAttribute('data-duo-social', network);
        const target = network === 'instagram' ? studioInstagram : '';
        if (href !== target) anchor.setAttribute('href', target);
        if (network === 'instagram') {
          anchor.setAttribute('aria-label', 'Instagram @duo.think');
          anchor.removeAttribute('aria-disabled');
        } else {
          anchor.setAttribute('aria-disabled', 'true');
          anchor.removeAttribute('target');
        }
      }
    }
  };
  doc.addEventListener('click', guardStudioIdentityClick, true);
  doc.addEventListener('auxclick', guardStudioIdentityClick, true);
  normalize();
  new MutationObserver(normalize).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
}
