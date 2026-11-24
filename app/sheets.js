import { createSign } from 'node:crypto';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
let cachedToken;

/** Server-only credentials. Neither the private key nor the token reaches the browser. */
export function sheetsConfigured(env) {
  return Boolean(env.GOOGLE_SHEETS_ID && env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY);
}

async function accessToken(env, transport) {
  const key = env.GOOGLE_PRIVATE_KEY.replace(/\\n/gu, '\n');
  if (transport === fetch && cachedToken?.email === env.GOOGLE_CLIENT_EMAIL &&
      cachedToken.key === key && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: env.GOOGLE_CLIENT_EMAIL, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(content).sign(key, 'base64url');
  const response = await transport(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${content}.${signature}` }).toString(),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Google authentication failed.');
  const result = await response.json();
  if (!result.access_token) throw new Error('Google returned no token.');
  if (transport === fetch) cachedToken = { token: result.access_token, email: env.GOOGLE_CLIENT_EMAIL,
    key, expires: Date.now() + Number(result.expires_in || 3600) * 1000 };
  return result.access_token;
}

export const SHEET_HEADERS = ['Recebido em (UTC)', 'ID do pedido', 'Nome', 'Empresa', 'E-mail',
  'WhatsApp', 'Solução', 'Tamanho da equipe', 'Investimento previsto', 'Sobre o projeto',
  'Consentimento de contato', 'Origem'];

export async function appendInquiry(fields, env, transport = fetch) {
  const token = await accessToken(env, transport);
  const tab = (env.GOOGLE_SHEETS_TAB || 'Leads').replace(/'/gu, "''");
  const range = encodeURIComponent(`'${tab}'!A:L`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEETS_ID)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const row = [new Date().toISOString(), fields.submissionId || '', fields.name, fields.company || '',
    fields.email, fields.phone || '', fields.service, fields.team || '', fields.budget || '',
    fields.project || '', fields.consent === 'yes' ? 'Sim' : '', fields.flow === 'briefing' ? 'DuoThink /contact' : 'Site integrado'];
  const response = await transport(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Google Sheets write failed.');
  const result = await response.json();
  if (result.updates?.updatedRows !== 1) throw new Error('Google Sheets did not confirm the row.');
}
