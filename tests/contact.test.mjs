import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateInquiry, sendInquiry } from '../app/contact.js';
import { generateKeyPairSync, createVerify } from 'node:crypto';

const inquiry = {
  name: 'João Silva',
  email: 'joao@example.com',
  service: 'Sites',
  project: 'Improve our organic visibility.',
};

test('contact fields are normalized and validated', () => {
  assert.deepEqual(validateInquiry({ ...inquiry, name: '  João Silva  ' }).fields, inquiry);
  for (const key of Object.keys(inquiry))
    assert.ok(validateInquiry({ ...inquiry, [key]: '' }).error);
  assert.ok(validateInquiry({ ...inquiry, email: 'invalid' }).error);
  assert.ok(
    validateInquiry({ ...inquiry, email: 'joao@example.com\nBcc:other@example.com' }).error,
  );
  assert.ok(validateInquiry({ ...inquiry, service: 'Unknown' }).error);
  assert.ok(validateInquiry({ ...inquiry, project: 'a'.repeat(6_001) }).error);
  assert.ok(validateInquiry(null).error);
});

test('the three DuoThink services can be submitted by the contact form', () => {
  const markup = readFileSync(new URL('../pages-original/contact/index.html', import.meta.url), 'utf8');
  const choices = [...markup.matchAll(/<input\b[^>]*name="service"[^>]*value="([^"]+)"/gu)].map(
    (match) => match[1],
  );
  assert.deepEqual(choices, ['Sites', 'Plataformas internas', 'Aplicativos']);
  for (const service of choices) {
    assert.equal(validateInquiry({ ...inquiry, service }).fields?.service, service);
  }
  for (const service of ['SEO', 'Design de marca', 'Paid Advertising', 'Packaging Design']) {
    assert.ok(validateInquiry({ ...inquiry, service }).error);
  }
});

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const env = { GOOGLE_SHEETS_ID: 'test-sheet', GOOGLE_SHEETS_TAB: "Leads d'empresa",
  GOOGLE_CLIENT_EMAIL: 'test@project.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().replace(/\n/gu, '\\n') };
const { project: legacyProject, ...contactDetails } = inquiry;
const briefing = { ...contactDetails, flow: 'briefing', company: 'DuoThink', phone: '(11) 98765-4321',
  budget: 'Preciso de orientação',
  submissionId: 'e70d7084-1b1b-4c46-b9e6-f5bde5428cc3' };

test('complete briefing validates every step and allowed choices without a consent checkbox', () => {
  assert.deepEqual(validateInquiry(briefing).fields, briefing);
  for (const key of Object.keys(briefing).filter(key => key !== 'flow'))
    assert.ok(validateInquiry({ ...briefing, [key]: '' }).error, key);
  for (const changes of [{ phone: '123' }, { phone: 'abcdefghij' },
    { budget: 'invalid' }, { submissionId: 'invalid' }])
    assert.ok(validateInquiry({ ...briefing, ...changes }).error);
});

test('unconfigured Sheets delivery never claims that data was saved', async () => {
  const result = await sendInquiry(briefing, {}, () => { throw new Error('No transport expected.'); });
  assert.equal(result.status, 503);
  assert.equal(result.body.ok, undefined);
});

test('Sheets delivery signs a valid scoped JWT and appends all values as RAW strings', async () => {
  const calls = [];
  const formula = '=IMPORTXML("example.com","*")';
  const result = await sendInquiry({ ...briefing, company: formula }, env, async (url, options) => {
    calls.push(url);
    if (url === 'https://oauth2.googleapis.com/token') {
      const assertion = new URLSearchParams(options.body).get('assertion');
      const [header, payload, signature] = assertion.split('.');
      assert.equal(createVerify('RSA-SHA256').update(`${header}.${payload}`).verify(publicKey, signature, 'base64url'), true);
      const claims = JSON.parse(Buffer.from(payload, 'base64url'));
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/spreadsheets');
      assert.equal(claims.iss, env.GOOGLE_CLIENT_EMAIL);
      assert.equal(claims.exp - claims.iat, 3600);
      return { ok: true, json: async () => ({ access_token: 'test-token', expires_in: 3600 }) };
    }
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('valueInputOption'), 'RAW');
    assert.equal(parsed.searchParams.get('insertDataOption'), 'INSERT_ROWS');
    assert.match(decodeURIComponent(parsed.pathname), /'Leads d''empresa'!A:L:append/u);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const { values } = JSON.parse(options.body);
    assert.deepEqual(values[0].slice(1), [briefing.submissionId, briefing.name, formula, briefing.email,
      briefing.phone, briefing.service, '', briefing.budget, '', '', 'DuoThink /contact']);
    return { ok: true, json: async () => ({ updates: { updatedRows: 1 } }) };
  });
  assert.equal(calls.length, 2);
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
});

test('authentication failures, rejected writes and unconfirmed rows remain errors', async () => {
  for (const stage of ['token', 'append', 'unconfirmed']) {
    const result = await sendInquiry(briefing, env, async url => {
      if (url.includes('oauth2')) return { ok: stage !== 'token', json: async () => ({ access_token: 'test-token' }) };
      return { ok: stage !== 'append', json: async () => ({ updates: { updatedRows: 0 } }) };
    });
    assert.equal(result.status, 502);
    assert.equal(result.body.ok, undefined);
  }
});

test('an optional email failure does not report failure after Sheets accepted the lead', async () => {
  const result = await sendInquiry(briefing, { ...env, RESEND_API_KEY: 'test', CONTACT_FROM_EMAIL: 'a@example.com', CONTACT_TO_EMAIL: 'b@example.com' }, async url => {
    if (url.includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'test-token' }) };
    if (url.includes('sheets.googleapis')) return { ok: true, json: async () => ({ updates: { updatedRows: 1 } }) };
    return { ok: false };
  });
  assert.equal(result.status, 200);
});

test('the API records a briefing once and reuses the confirmation for the same request ID', async () => {
  const { POST } = await import('../app/api/contact/route.js');
  const originalFetch = globalThis.fetch;
  const originalEnvironment = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  let writes = 0;
  Object.assign(process.env, env);
  globalThis.fetch = async (url) => {
    if (url.includes('oauth2')) return Response.json({ access_token: 'api-test-token', expires_in: 3600 });
    writes += 1;
    return Response.json({ updates: { updatedRows: 1 } });
  };
  const request = (body = briefing) => new Request('http://localhost/api/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await POST(request())).status, 200);
    assert.equal((await POST(request())).status, 200);
    assert.equal(writes, 1);
    assert.equal((await POST(request({ ...briefing, company: 'Different company' }))).status, 409);
    assert.equal(writes, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
