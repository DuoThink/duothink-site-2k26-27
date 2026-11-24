import { initializeContactForm } from '/assets/scripts/modules/contact-form.js?v=2.1.0';
import { normalizeStudioLinks } from './studio-links.mjs';
import { installStudioIdentity } from './studio-identity.mjs?v=1';

const studio = document.documentElement.dataset.architecture;
const titles = { cakra: 'Cakra', viresta: 'Viresta', zeta: 'Zeta', 'bruno-brandini': 'Bruno Brandini', calibre: 'Calibre', cavora: 'Cavora', forma: 'Forma', grid: 'Grid', housemood: 'Housemood', intera: 'Intera', korda: 'Korda', totnt: 'TOTNT' };

function correctFields() {
  if (studio !== 'viresta') return;
  for (const form of document.forms) {
    const phone = form.querySelectorAll('input.framer-form-input')[2];
    if (phone) {
      phone.type = 'tel';
      phone.name = 'Phone number';
      if (phone.placeholder !== 'Seu telefone') phone.placeholder = 'Seu telefone';
    }
    const message = form.querySelector('textarea');
    if (message) {
      message.name = 'Message';
      if (message.placeholder !== 'Conte-nos sobre o projeto') message.placeholder = 'Conte-nos sobre o projeto';
      const title = message.closest('label')?.querySelector('p');
      if (title && title.textContent !== 'Mensagem') title.textContent = 'Mensagem';
    }
  }
}

function readFields(form) {
  if (!['cakra', 'viresta', 'zeta'].includes(studio)) {
    const fields = [...form.querySelectorAll('input:not([type="hidden"]),textarea,select')];
    const label = (field) => [field.name, field.placeholder, field.getAttribute('aria-label')].filter(Boolean).join(' ');
    const text = fields.filter((field) => field.matches('input[type="text"],input:not([type])'));
    const names = text.filter((field) => /name|nome/iu.test(label(field)));
    const name = (names.length ? names : text.slice(0, 1)).map((field) => field.value.trim()).filter(Boolean).join(' ');
    const email = fields.find((field) => field.type === 'email' || /e-?mail/iu.test(label(field)))?.value.trim() || '';
    const details = fields.filter((field) => !names.includes(field) && field.type !== 'email'
      && !['submit', 'button', 'checkbox', 'radio'].includes(field.type) && field.value.trim())
      .map((field) => `${field.name || field.placeholder || 'Detalhe'} — ${field.value.trim()}`);
    return { name, email, service: 'Sites', project: [`Origem do contato — ${titles[studio]}`, ...details].join('\n\n') };
  }
  const names = [...form.querySelectorAll('input.framer-form-input[type="text"]')];
  const name = names.map((field) => field.value.trim()).filter(Boolean).join(' ');
  const email = form.querySelector('input.framer-form-input[type="email"]')?.value.trim() || '';
  const phone = form.querySelector('input[type="tel"]')?.value.trim();
  const message = form.querySelector('textarea')?.value.trim() || '';
  const details = [`Origem do contato — ${titles[studio]}`, message];
  if (phone) details.push(`Telefone — ${phone}`);
  return { name, email, service: 'Sites', project: details.join('\n\n') };
}

installStudioIdentity();
correctFields();
normalizeStudioLinks(studio);
new MutationObserver(() => {
  correctFields();
  normalizeStudioLinks(studio);
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
initializeContactForm({ selector: 'form', readFields });
