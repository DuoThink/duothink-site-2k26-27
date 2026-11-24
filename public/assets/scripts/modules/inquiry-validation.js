// Shared by the browser and server. Format checks do not verify account ownership/existence.
// Anatel: https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais
const AREA_CODES = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const SERVICES = new Set(['Sites', 'Plataformas internas', 'Aplicativos']);
const BUDGETS = new Set(['Até R$ 5 mil', 'R$ 5 mil a R$ 15 mil', 'R$ 15 mil a R$ 30 mil', 'Acima de R$ 30 mil', 'Preciso de orientação']);

export function phoneDigits(value) {
  let digits = String(value).replace(/\D/gu, '');
  if (/^\s*\+55/u.test(value)) digits = digits.slice(2);
  else if (/^\s*0055/u.test(value)) digits = digits.slice(4);
  else if (/^\s*55\d{11}\s*$/u.test(value)) digits = digits.slice(2);
  return digits;
}

export function formatPhone(value) {
  const digits = phoneDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length < 3) return `(${digits}`;
  const subscriber = digits.slice(2);
  const split = subscriber.length > 8 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${subscriber.slice(0, split)}${subscriber.length > split ? '-' + subscriber.slice(split) : ''}`;
}

export function normalizeField(name, value) {
  const text = String(value ?? '').trim().normalize('NFC');
  if (name === 'name' || name === 'company') return text.replace(/\s+/gu, ' ');
  if (name === 'email') {
    const at = text.lastIndexOf('@');
    return at < 0 ? text : text.slice(0, at + 1) + text.slice(at + 1).toLowerCase();
  }
  if (name === 'phone') return formatPhone(text);
  return text;
}

export function fieldError(name, raw) {
  const value = String(raw ?? '').trim();
  if (name === 'name') {
    if (!value) return 'Informe seu nome.';
    if (value.length > 150 || (value.match(/\p{L}/gu)?.length || 0) < 2 || !/^[\p{L}\p{M} .’'\-]+$/u.test(value))
      return 'Informe um nome válido, sem números ou símbolos.';
  } else if (name === 'company') {
    if (!value) return 'Informe o nome da sua empresa.';
    if (value.length < 2 || value.length > 150 || !/[\p{L}\p{N}]/u.test(value) || /[<>\u0000-\u001f]/u.test(value))
      return 'Informe um nome de empresa válido, com 2 a 150 caracteres.';
  } else if (name === 'email') {
    if (!value) return 'Informe seu e-mail.';
    const parts = value.split('@');
    const local = parts[0], domain = parts[1] || '';
    const labels = domain.split('.');
    const validLocal = /^[a-z\d!#$%&'*+/=?^_`{|}~.\-]+$/iu.test(local || '') && local.length <= 64
      && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..');
    const validDomain = labels.length > 1 && labels.every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/iu.test(label))
      && /^(?:[a-z]{2,63}|xn--[a-z\d-]+)$/iu.test(labels.at(-1));
    if (value.length > 254 || parts.length !== 2 || !validLocal || !validDomain)
      return 'Confira o e-mail. Exemplo: voce@empresa.com.br.';
  } else if (name === 'phone') {
    if (!value) return 'Informe seu WhatsApp com DDD.';
    if (/[^\d\s()+.\-]/u.test(value) || /^\+(?!55)/u.test(value) || /^00(?!55)/u.test(value))
      return 'Informe um número brasileiro com DDD, ou com +55.';
    const digits = phoneDigits(value);
    if (![10, 11].includes(digits.length)) return 'Complete o número com DDD e 8 ou 9 dígitos.';
    if (!AREA_CODES.has(digits.slice(0, 2))) return 'Confira o DDD informado.';
    const subscriber = digits.slice(2);
    if (/^(\d)\1+$/u.test(subscriber)) return 'Informe um número válido, sem repetir todos os dígitos.';
    if ((digits.length === 11 && !subscriber.startsWith('9')) || (digits.length === 10 && !/^[2-5]/u.test(subscriber)))
      return 'Confira o número: celular deve começar com 9; telefone fixo, com 2 a 5.';
  } else if (name === 'service' && !SERVICES.has(value)) return 'Escolha o que você precisa desenvolver.';
  else if (name === 'budget' && !BUDGETS.has(value)) return 'Selecione o investimento previsto.';
  return '';
}
