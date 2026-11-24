import { sendInquiry, validateInquiry } from '../../contact.js';

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const MAX_BYTES = 12_000;
const deliveries = new Map();

function reply(status, body, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function methodNotAllowed() {
  return reply(405, { message: 'Método não permitido.' }, { Allow: 'POST' });
}

export { methodNotAllowed as GET, methodNotAllowed as HEAD, methodNotAllowed as PUT,
  methodNotAllowed as PATCH, methodNotAllowed as DELETE, methodNotAllowed as OPTIONS };

export async function POST(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') ?? new URL(request.url).host;
  if (origin) {
    try {
      if (new URL(origin).host !== host)
        return reply(403, { message: 'A solicitação deve ser enviada por este site.' });
    } catch {
      return reply(403, { message: 'Origem inválida.' });
    }
  }

  const now = Date.now();
  for (const [address, entry] of attempts) {
    if (now - entry.start > WINDOW_MS) attempts.delete(address);
  }
  const address = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-forwarded-for')?.split(',').at(-1).trim()
    || 'unknown';
  const attempt = attempts.get(address) ?? { count: 0, start: now };
  if (attempt.count >= MAX_ATTEMPTS)
    return reply(429, { message: 'Muitos pedidos. Tente mais tarde ou fale conosco por email.' });
  attempt.count += 1;
  attempts.set(address, attempt);

  if (!request.headers.get('content-type')?.includes('application/json'))
    return reply(415, { message: 'Envie dados em JSON.' });
  if (Number(request.headers.get('content-length')) > MAX_BYTES)
    return reply(413, { message: 'O pedido é muito longo.' });

  try {
    const buffers = [];
    let size = 0;
    for await (const chunk of request.body ?? []) {
      size += chunk.byteLength;
      if (size > MAX_BYTES) return reply(413, { message: 'O pedido é muito longo.' });
      buffers.push(chunk);
    }
    const validation = validateInquiry(JSON.parse(Buffer.concat(buffers).toString('utf8')));
    if (validation.error) return reply(400, { message: validation.error, fieldErrors: validation.fieldErrors });
    for (const [id, entry] of deliveries) {
      if (Date.now() - entry.created > WINDOW_MS) deliveries.delete(id);
    }
    const id = validation.fields.submissionId;
    const fingerprint = JSON.stringify(validation.fields);
    const previous = id && deliveries.get(id);
    if (previous && previous.fingerprint !== fingerprint)
      return reply(409, { message: 'O pedido foi alterado. Atualize a página antes de enviar novamente.' });
    let delivery = previous?.delivery;
    if (!delivery) {
      delivery = sendInquiry(validation.fields);
      if (id) deliveries.set(id, { created: Date.now(), fingerprint, delivery });
    }
    const result = await delivery;
    if (id && result.status !== 200) deliveries.delete(id);
    return reply(result.status, result.body);
  } catch (error) {
    if (error instanceof SyntaxError) return reply(400, { message: 'JSON inválido.' });
    return reply(502, { message: 'Não foi possível enviar. Tente novamente ou fale conosco por email.' });
  }
}
