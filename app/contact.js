import { appendInquiry, sheetsConfigured } from './sheets.js';
import { fieldError, normalizeField } from '../public/assets/scripts/modules/inquiry-validation.js';

const SERVICES = new Set(['Sites', 'Plataformas internas', 'Aplicativos']);
const MAX_FIELD_LENGTH = 6_000;

export function validateInquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { error: 'Pedido inválido.' };
  if (input.flow === 'briefing') {
    const fields = { flow: 'briefing' };
    const fieldErrors = {};
    for (const name of ['name', 'company', 'email', 'phone', 'service', 'budget']) {
      const raw = typeof input[name] === 'string' ? input[name] : '';
      const error = raw.length > MAX_FIELD_LENGTH ? 'O valor informado é muito longo.' : fieldError(name, raw);
      if (error) fieldErrors[name] = error;
      fields[name] = normalizeField(name, raw);
    }
    if (Object.keys(fieldErrors).length) return { error: Object.values(fieldErrors)[0], fieldErrors };
    if (typeof input.submissionId !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(input.submissionId))
      return { error: 'Atualize a página e tente novamente.' };
    fields.submissionId = input.submissionId;
    return { fields };
  }
  const fields = {};
  const required = ['name', 'email', 'service', 'project'];
  for (const key of required) {
    if (
      typeof input[key] !== 'string' ||
      !input[key].trim() ||
      input[key].length > MAX_FIELD_LENGTH
    )
      return { error: 'Preencha todos os campos com informações válidas.' };
    fields[key] = input[key].trim();
  }
  if (
    fields.name.length > 150 ||
    fields.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(fields.email) ||
    /[\r\n]/u.test(fields.email)
  )
    return { error: 'Informe um nome e um endereço de email válidos.' };
  if (!SERVICES.has(fields.service)) return { error: 'Selecione um dos serviços disponíveis.' };
  return { fields };
}

export async function sendInquiry(fields, environment = process.env, transport = fetch) {
  if (!sheetsConfigured(environment))
    return {
      status: 503,
      body: { message: 'O envio está temporariamente indisponível. Seus dados foram mantidos. Tente novamente mais tarde ou fale com a DuoThink pelo WhatsApp.' },
    };
  try { await appendInquiry(fields, environment, transport); }
  catch { return { status: 502, body: { message: 'Não foi possível registrar seu pedido. Seus dados foram mantidos; tente novamente.' } }; }

  // Sheets is the source of truth. Optional email failure must not duplicate an already saved lead.
  if (environment.RESEND_API_KEY && environment.CONTACT_FROM_EMAIL && environment.CONTACT_TO_EMAIL) {
    try {
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${environment.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: environment.CONTACT_FROM_EMAIL,
          to: [environment.CONTACT_TO_EMAIL],
          reply_to: fields.email,
          subject: `Novo projeto: ${fields.service}`,
          text: `Nome: ${fields.name}\nEmpresa: ${fields.company || 'Não informada'}\nEmail: ${fields.email}\nWhatsApp: ${fields.phone || 'Não informado'}\nServiço: ${fields.service}\nInvestimento: ${fields.budget || 'Não informado'}\n\n${fields.project || ''}`,
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) console.warn('Optional contact notification failed.');
    } catch { console.warn('Optional contact notification failed.'); }
  }
  return { status: 200, body: { ok: true } };
}
